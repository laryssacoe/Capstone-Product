import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentSession } from "@/lib/server/auth"
import { buildStoryApprovalLinks, isMailerConfigured, sendStoryPendingUpdateEmail } from "@/lib/server/mailer"
import { prisma } from "@/lib/server/prisma"
import { syncScenarioRuntimeForStory } from "@/lib/server/scenario-runtime"
import { storyPayloadSchema, storyUpdatePayloadSchema, upsertStoryGraph, type StoryPayload } from "@/lib/server/story-graph"

export const dynamic = "force-dynamic"

type SessionUser = {
  id: string
  role: string
  email?: string | null
  username?: string | null
}

// Avatar metadata schema for validation
const avatarMetadataSchema = z.object({
  name: z.string().min(1),
  age: z.number().optional(),
  background: z.string().min(1),
  appearance: z.object({
    skinTone: z.string().optional(),
    hairColor: z.string().optional(),
    hairStyle: z.string().optional(),
    clothing: z.string().optional(),
    accessories: z.array(z.string()).optional(),
    image: z.string().optional(),
  }).optional(),
  initialResources: z.object({
    money: z.number(),
    time: z.number(),
    health: z.number().optional().default(100),
    socialSupport: z.number().optional().default(50),
    mentalHealth: z.number().optional().default(70),
    physicalHealth: z.number().optional().default(80),
  }),
  socialContext: z.object({
    socioeconomicStatus: z.string().optional(),
    location: z.string().optional(),
    familyStructure: z.string().optional(),
    educationLevel: z.string().optional(),
    employmentStatus: z.string().optional(),
    healthConditions: z.array(z.string()).optional(),
    socialIssues: z.array(z.object({
      id: z.string(),
      type: z.string(),
      severity: z.string(),
      description: z.string(),
      impacts: z.array(z.string()),
    })).optional(),
  }).optional(),
  isPlayable: z.boolean().optional().default(true),
}).optional()

function normalizeMedia(media: unknown) {
  if (!media || typeof media !== "object") return undefined
  const raw = media as Record<string, unknown>
  const visual =
    (typeof raw.visual === "string" && raw.visual.trim()) ||
    (typeof raw.image === "string" && raw.image.trim()) ||
    undefined
  const audio = typeof raw.audio === "string" && raw.audio.trim() ? raw.audio.trim() : undefined
  const normalized: Record<string, string> = {}
  if (visual) normalized.visual = visual
  if (audio) normalized.audio = audio
  return Object.keys(normalized).length ? normalized : undefined
}

function normalizeContent(content: unknown) {
  if (!content || typeof content !== "object") return content ?? undefined
  const raw = content as Record<string, any>
  const normalized: Record<string, any> = { ...raw }
  const text = raw.text
  if (Array.isArray(text)) {
    normalized.text = text.map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
  } else if (typeof text === "string") {
    const paragraphs = text
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
    normalized.text = paragraphs.length ? paragraphs : [text.trim()]
  }
  return normalized
}

// Create or update avatar profile from metadata
async function upsertAvatarFromMetadata(
  storyId: string,
  avatarMetadata: z.infer<typeof avatarMetadataSchema>,
) {
  if (!avatarMetadata) return null

  const existingAvatar = await prisma.avatarProfile.findFirst({
    where: { storyId },
  })

  const avatarData = {
    name: avatarMetadata.name,
    background: avatarMetadata.background,
    initialResources: {
      money: avatarMetadata.initialResources.money,
      time: avatarMetadata.initialResources.time,
      health: avatarMetadata.initialResources.health ?? 100,
      socialSupport: avatarMetadata.initialResources.socialSupport ?? 50,
      mentalHealth: avatarMetadata.initialResources.mentalHealth ?? 70,
      physicalHealth: avatarMetadata.initialResources.physicalHealth ?? 80,
    },
    appearance: avatarMetadata.appearance ?? {},
    socialContext: avatarMetadata.socialContext ?? {},
    isPlayable: avatarMetadata.isPlayable ?? true,
    updatedAt: new Date(),
  }

  if (existingAvatar) {
    await prisma.avatarProfile.update({
      where: { id: existingAvatar.id },
      data: avatarData,
    })
    return existingAvatar.id
  } else {
    const newAvatar = await prisma.avatarProfile.create({
      data: {
        id: randomUUID(),
        storyId,
        ...avatarData,
        createdAt: new Date(),
      },
    })
    return newAvatar.id
  }
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

    // Fetch avatar profiles for each story 
    const storyIds = stories.map(s => s.id)
    let avatarByStoryId = new Map<string | null | undefined, any>()
    if (typeof prisma.avatarProfile?.findMany === "function" && storyIds.length > 0) {
      const avatarProfiles = await prisma.avatarProfile.findMany({
        where: { storyId: { in: storyIds } },
      })
      avatarByStoryId = new Map(avatarProfiles.map((a) => [a.storyId, a]))
    }

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

      // Get avatar metadata if present
      const avatarProfile = avatarByStoryId.get(story.id)
      const avatarMetadata = avatarProfile ? {
        name: avatarProfile.name,
        background: avatarProfile.background,
        appearance: avatarProfile.appearance as any,
        initialResources: avatarProfile.initialResources as any,
        socialContext: avatarProfile.socialContext as any,
        isPlayable: avatarProfile.isPlayable,
      } : undefined

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
        nodes: nodes.map((node) => {
          const normalizedContent = normalizeContent(node.content)
          const normalizedMedia = normalizeMedia(node.media)
          return {
            key: node.key,
            title: node.title ?? undefined,
            synopsis: node.synopsis ?? undefined,
            type: node.type,
            content: normalizedContent ?? undefined,
            media: normalizedMedia ?? undefined,
          }
        }),
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
        metadata: avatarMetadata ? { avatar: avatarMetadata } : undefined,
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
  let avatarData: z.infer<typeof avatarMetadataSchema> | undefined
  let storyRuntimeData: unknown
  
  try {
    const json = await request.json()
    
    // Extract avatar metadata before validation
    if (json.metadata?.avatar) {
      const avatarParsed = avatarMetadataSchema.safeParse(json.metadata.avatar)
      if (avatarParsed.success) {
        avatarData = avatarParsed.data
      }
    }
    if (json.metadata?.storyRuntime !== undefined) {
      storyRuntimeData = json.metadata.storyRuntime
    }
    
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

    // Handle avatar metadata
    if (avatarData) {
      await upsertAvatarFromMetadata(story.id, avatarData)
    }
    await syncScenarioRuntimeForStory({
      story,
      avatar: avatarData,
      runtimeRaw: storyRuntimeData,
    })

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
  let avatarData: z.infer<typeof avatarMetadataSchema> | undefined
  let storyRuntimeData: unknown
  
  try {
    const json = await request.json()
    
    // Extract avatar metadata before validation
    if (json.metadata?.avatar) {
      const avatarParsed = avatarMetadataSchema.safeParse(json.metadata.avatar)
      if (avatarParsed.success) {
        avatarData = avatarParsed.data
      }
    }
    if (json.metadata?.storyRuntime !== undefined) {
      storyRuntimeData = json.metadata.storyRuntime
    }
    
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

    // Handle avatar metadata
    if (avatarData) {
      await upsertAvatarFromMetadata(story.id, avatarData)
    }
    await syncScenarioRuntimeForStory({
      story,
      avatar: avatarData,
      runtimeRaw: storyRuntimeData,
      previousSlug: existingStory.slug,
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

    // Delete associated avatar profile first 
    if (typeof prisma.avatarProfile?.deleteMany === "function") {
      await prisma.avatarProfile.deleteMany({
        where: { storyId: story.id },
      })
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