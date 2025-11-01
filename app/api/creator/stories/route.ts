import { NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/server/auth"
import { buildStoryApprovalLinks, isMailerConfigured, sendStoryPendingUpdateEmail } from "@/lib/server/mailer"
import { prisma } from "@/lib/server/prisma"
import {
  storyPayloadSchema,
  storyUpdatePayloadSchema,
  upsertStoryGraph,
  type StoryPayload,
} from "@/lib/server/story-graph"

type SessionUser = {
  id: string
  role: string
  email?: string | null
  username?: string | null
}

async function handlePendingStoryUpdate(story: {
  id: string
  slug: string
  title: string
  summary: string | null
  tags: string[] | null
  visibility: string
  approvalToken?: string | null
}, sessionUser: SessionUser) {
  if (sessionUser.role !== "CREATOR") {
    return null
  }

  if (
    typeof prisma.storyVersion?.findFirst !== "function" ||
    typeof prisma.storyNode?.findMany !== "function" ||
    typeof prisma.storyPath?.findMany !== "function" ||
    typeof prisma.storyTransition?.findMany !== "function"
  ) {
    console.warn("[api/creator/stories] Skipping pending update sync: prisma delegate missing in test context.")
    return null
  }

  const pendingVersion = await prisma.storyVersion.findFirst({
    where: { storyId: story.id, status: "PENDING" },
    orderBy: { versionNumber: "desc" },
  })

  if (!pendingVersion) {
    return null
  }

  const [nodes, paths, transitions] = await Promise.all([
    prisma.storyNode.findMany({ where: { storyId: story.id }, orderBy: { createdAt: "asc" } }),
    prisma.storyPath.findMany({ where: { storyId: story.id }, orderBy: { createdAt: "asc" } }),
    prisma.storyTransition.findMany({
      where: { storyId: story.id },
      orderBy: [{ fromNodeId: "asc" }, { ordering: "asc" }],
    }),
  ])

  const metadataBase =
    pendingVersion.metadata &&
    typeof pendingVersion.metadata === "object" &&
    !Array.isArray(pendingVersion.metadata)
      ? { ...(pendingVersion.metadata as Record<string, unknown>) }
      : {}

  const previousVersionNumber = pendingVersion.versionNumber
  const nextVersionNumber = previousVersionNumber + 1
  const metadataWithUpdate = {
    ...metadataBase,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedByUserId: sessionUser.id,
  }

  const updatedVersion = await prisma.storyVersion.update({
    where: { id: pendingVersion.id },
    data: {
      versionNumber: nextVersionNumber,
      changelog: "Creator updated story while pending review",
      content: {
        story: {
          id: story.id,
          slug: story.slug,
          title: story.title,
          summary: story.summary,
          tags: story.tags,
          visibility: story.visibility,
        },
        nodes,
        paths,
        transitions,
      },
      metadata: metadataWithUpdate,
    },
    select: { id: true, metadata: true, versionNumber: true },
  })

  await prisma.storyAuditLog.create({
    data: {
      storyId: story.id,
      actorId: sessionUser.id,
      action: "UPDATED_PENDING_SUBMISSION",
      metadata: {
        previousVersionNumber,
        newVersionNumber: updatedVersion.versionNumber,
      },
    },
  })

  const metadataForLinks =
    updatedVersion.metadata &&
    typeof updatedVersion.metadata === "object" &&
    !Array.isArray(updatedVersion.metadata)
      ? (updatedVersion.metadata as Record<string, unknown>)
      : {}

  const approvalTokenFromMetadata =
    typeof metadataForLinks.approvalToken === "string"
      ? (metadataForLinks.approvalToken as string)
      : undefined

  const approvalToken =
    approvalTokenFromMetadata ??
    (typeof story.approvalToken === "string" ? story.approvalToken : undefined)

  const links = approvalToken
    ? buildStoryApprovalLinks(story.slug, updatedVersion.id, approvalToken)
    : { approveUrl: undefined, rejectUrl: undefined, previewUrl: undefined }

  if (!isMailerConfigured()) {
    console.warn("[api/creator/stories] Pending update email skipped: mailer not configured.")
    return {
      delivered: false,
      message: "Mailer configuration missing. Set SMTP environment variables to receive pending update notifications.",
    }
  }

  try {
    await sendStoryPendingUpdateEmail({
      storyTitle: story.title,
      storySlug: story.slug,
      versionId: updatedVersion.id,
      versionNumber: updatedVersion.versionNumber,
      previousVersionNumber,
      submitterEmail: sessionUser.email,
      submitterUsername: sessionUser.username,
      approveUrl: links.approveUrl,
      rejectUrl: links.rejectUrl,
      previewUrl: links.previewUrl,
    })
    return { delivered: true }
  } catch (error) {
    console.error("[api/creator/stories] Failed to send pending update email", error)
    return {
      delivered: false,
      message: "Pending update email could not be sent. Check SMTP configuration and logs.",
    }
  }
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stories = await prisma.twineStory.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        nodes: { orderBy: { createdAt: "asc" } },
        paths: { orderBy: { createdAt: "asc" } },
        transitions: true,
        owner: { select: { id: true, username: true, email: true, profile: { select: { displayName: true } } } },
        versions: {
          orderBy: { versionNumber: "desc" },
          select: { id: true, status: true, versionNumber: true, submittedAt: true, reviewedAt: true },
        },
        latestVersion: {
          select: { id: true, status: true, versionNumber: true, submittedAt: true, reviewedAt: true },
        },
      },
    });

    const payload = stories.map((story) => {
      const latestApproved = story.latestVersion;
      const pendingVersion = story.versions.find((version) => version.status === "PENDING");
      const rejectedVersion = story.versions.find((version) => version.status === "REJECTED");

      let reviewStatus: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED" = "DRAFT";
      let reviewVersionNumber: number | null = null;

      if (pendingVersion) {
        reviewStatus = "PENDING";
        reviewVersionNumber = pendingVersion.versionNumber;
      } else if (latestApproved && latestApproved.status === "APPROVED") {
        reviewStatus = "APPROVED";
        reviewVersionNumber = latestApproved.versionNumber;
      } else if (rejectedVersion) {
        reviewStatus = "REJECTED";
        reviewVersionNumber = rejectedVersion.versionNumber;
      } else if (story.visibility === "PUBLIC") {
        reviewStatus = "APPROVED";
      }

      const nodes = Array.isArray(story.nodes) ? story.nodes : [];
      const paths = Array.isArray(story.paths) ? story.paths : [];
      const transitions = Array.isArray(story.transitions) ? story.transitions : [];

      return {
        id: story.id,
        slug: story.slug,
        title: story.title,
        summary: story.summary,
        tags: story.tags ?? [],
        visibility: story.visibility ?? "PRIVATE",
        createdAt: story.createdAt,
        updatedAt: story.updatedAt,
        reviewStatus,
        reviewVersionNumber,
        nodes: nodes.map((node) => ({
          key: node.key,
          title: node.title ?? undefined,
          synopsis: node.synopsis ?? undefined,
          type: node.type,
          content: node.content ?? undefined,
          media: node.media ?? undefined,
        })),
        paths: paths.map((path) => ({
          key: path.key,
          label: path.label,
          summary: path.summary ?? undefined,
          metadata: path.metadata ?? undefined,
        })),
        transitions: transitions.map((transition) => ({
          from: nodes.find((n) => n.id === transition.fromNodeId)?.key ?? transition.fromNodeId,
          to: nodes.find((n) => n.id === transition.toNodeId)?.key ?? null,
          path: paths.find((p) => p.id === transition.pathId)?.key ?? transition.pathId,
          ordering: transition.ordering ?? undefined,
          condition: transition.condition ?? undefined,
          effect: transition.effect ?? undefined,
        })),
        author: story.owner
          ? {
              id: story.owner.id,
              displayName: story.owner.profile?.displayName || story.owner.username || story.owner.email || "Unknown",
              email: story.owner.email || "",
            }
          : undefined,
      };
    });

    return NextResponse.json({ stories: payload });
  } catch (error) {
    console.error("[api/creator/stories] Failed to load stories", error);
    const message =
      error instanceof Error
        ? error.message || "Failed to load stories."
        : "Failed to load stories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Creator access required." }, { status: 403 })
  }

  let parsed: ReturnType<typeof storyPayloadSchema.safeParse>
  try {
    const json = await request.json()
    parsed = storyPayloadSchema.safeParse(json)
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  if (!parsed.success) {
    const messages =
      parsed.error.errors?.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n') || 'Invalid story payload.'
    return NextResponse.json({ error: messages }, { status: 400 })
  }

  try {
    const { slug, title } = parsed.data

    const existingBySlug = await prisma.twineStory.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    })

    if (existingBySlug && existingBySlug.ownerId && existingBySlug.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Story code already in use by another creator." }, { status: 409 })
    }

    const conflictingTitle = await prisma.twineStory.findFirst({
      where: {
        title,
        NOT: { slug },
      },
      select: { id: true },
    })

    if (conflictingTitle) {
      return NextResponse.json({ error: "A story with this title already exists. Please choose a different title." }, { status: 409 })
    }

    const story = await upsertStoryGraph(session.user.id, parsed.data)

    const pendingUpdateEmailStatus = await handlePendingStoryUpdate(story, session.user)

    return NextResponse.json({ storyId: story.id, pendingUpdateEmail: pendingUpdateEmailStatus }, { status: 201 })
  } catch (error) {
    console.error("[api/creator/stories] Failed to save story", error)
    const message =
      error instanceof Error
        ? error.message || "Unable to save story. Please try again."
        : "Unable to save story. Please try again."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = Boolean(session.user.isAdmin)
  if (!isAdmin && session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Creator access required." }, { status: 403 })
  }

  let parsed: ReturnType<typeof storyUpdatePayloadSchema.safeParse>
  try {
    const json = await request.json()
    parsed = storyUpdatePayloadSchema.safeParse(json)
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  if (!parsed.success) {
    const messages =
      parsed.error.errors?.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n') || 'Invalid story payload.'
    return NextResponse.json({ error: messages }, { status: 400 })
  }

  try {
    const { storyId: targetStoryId, ...rest } = parsed.data
    const storyPayload = rest as StoryPayload
    const { slug, title } = storyPayload

    const existingStory = await prisma.twineStory.findUnique({
      where: { id: targetStoryId },
      select: {
        id: true,
        ownerId: true,
        slug: true,
        approvedAt: true,
        ownershipStatus: true,
      },
    })

    if (!existingStory) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 })
    }

    if (!isAdmin && existingStory.ownerId !== session.user.id) {
      return NextResponse.json({ error: "You do not have permission to edit this story." }, { status: 403 })
    }

    if (slug !== existingStory.slug) {
      const slugConflict = await prisma.twineStory.findUnique({
        where: { slug },
        select: { id: true },
      })

      if (slugConflict && slugConflict.id !== existingStory.id) {
        return NextResponse.json({ error: "Story code already in use by another story." }, { status: 409 })
      }
    }

    const conflictingTitle = await prisma.twineStory.findFirst({
      where: {
        title,
        id: { not: existingStory.id },
      },
      select: { id: true },
    })

    if (conflictingTitle) {
      return NextResponse.json({ error: "A story with this title already exists. Please choose a different title." }, { status: 409 })
    }

    const ownerIdForUpdate = existingStory.ownerId ?? session.user.id
    const shouldForcePublic = Boolean(existingStory.approvedAt) || existingStory.ownershipStatus === "PLATFORM_OWNED"
    const story = await upsertStoryGraph(ownerIdForUpdate, storyPayload, {
      storyId: existingStory.id,
      enforceVisibility: shouldForcePublic ? "PUBLIC" : undefined,
    })

    const pendingUpdateEmailStatus = await handlePendingStoryUpdate(story, session.user)

    return NextResponse.json({ storyId: story.id, pendingUpdateEmail: pendingUpdateEmailStatus }, { status: 200 })
  } catch (error) {
    console.error("[api/creator/stories] Failed to update story", error)
    const message =
      error instanceof Error
        ? error.message || "Unable to update story. Please try again."
        : "Unable to update story. Please try again."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let slug: string | null = null;
  try {
    const json = await request.json();
    slug = typeof json?.slug === "string" ? json.slug : null;
  } catch {
    // fall through to query param check
  }

  if (!slug) {
    const url = new URL(request.url);
    slug = url.searchParams.get("slug");
  }

  if (!slug) {
    return NextResponse.json({ error: "Missing story code." }, { status: 400 });
  }

  try {
    const story = await prisma.twineStory.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    if (!session.user.isAdmin && story.ownerId !== session.user.id) {
      return NextResponse.json({ error: "You do not have permission to delete this story." }, { status: 403 });
    }

    await prisma.twineStory.delete({
      where: { id: story.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[api/creator/stories] Failed to delete story", error);
    const message =
      error instanceof Error ? error.message || "Unable to delete story." : "Unable to delete story.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
