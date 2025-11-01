import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
import { buildStoryApprovalLinks, isMailerConfigured, sendStorySubmissionEmail } from "@/lib/server/mailer"

const ownershipSchema = z.object({
  transfer: z.boolean(),
  contact: z.boolean(),
})

const publishSchema = z.object({
  slug: z.string().min(1),
  ownershipAcknowledgement: ownershipSchema,
})

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Creator access required." }, { status: 403 })
  }

  const json = await request.json()
  const parsed = publishSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const { slug, ownershipAcknowledgement } = parsed.data

  if (!ownershipAcknowledgement.transfer || !ownershipAcknowledgement.contact) {
    return NextResponse.json(
      { error: "Ownership acknowledgement is required before submitting for approval." },
      { status: 400 },
    )
  }

  const [creatorProfile, userProfile] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
  ])

  if (session.user.role !== "ADMIN") {
    if (!creatorProfile || !creatorProfile.completedAt || creatorProfile.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Complete your creator profile before submitting stories for approval." },
        { status: 403 },
      )
    }
  }

  // Find the story owned by the user (admins can submit any)
  const story = await prisma.twineStory.findUnique({
    where: { slug },
    include: {
      versions: true,
    },
  })

  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 })
  }
  if (session.user.role !== "ADMIN" && story.ownerId !== session.user.id) {
    return NextResponse.json({ error: "You do not have access to this story." }, { status: 403 })
  }

  const creditName =
    creatorProfile?.penName ??
    userProfile?.displayName ??
    session.user.username ??
    session.user.email ??
    "Loop creator"
  const creditText = `Created by ${creditName}`

  // Load current graph snapshot
  const [nodes, paths, transitions] = await Promise.all([
    prisma.storyNode.findMany({ where: { storyId: story.id }, orderBy: { createdAt: "asc" } }),
    prisma.storyPath.findMany({ where: { storyId: story.id }, orderBy: { createdAt: "asc" } }),
    prisma.storyTransition.findMany({ where: { storyId: story.id }, orderBy: [{ fromNodeId: "asc" }, { ordering: "asc" }] }),
  ])

  const nextVersionNumber = (story.versions.reduce((max, v) => Math.max(max, v.versionNumber), 0) || 0) + 1
  const approvalToken = randomUUID()
  const submittedAt = new Date()
  const approvalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const forwardedHeader =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    null
  const ipAddress = forwardedHeader ? forwardedHeader.split(",")[0]?.trim() ?? null : null
  const userAgent = request.headers.get("user-agent") ?? null

  // Create a pending version for review
  const version = await prisma.storyVersion.create({
    data: {
      storyId: story.id,
      authorId: session.user.id,
      versionNumber: nextVersionNumber,
      status: "PENDING",
      changelog: "Submitted for approval",
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
      metadata: {
        approvalToken,
        approvalRequestedAt: submittedAt.toISOString(),
        ownershipAcknowledgement,
      },
      ownershipStatus: "PENDING_TRANSFER",
      consentSnapshot: {
        ownershipAcknowledgement,
      },
      submittedAt,
    },
    select: { id: true, versionNumber: true, status: true },
  })

  await prisma.twineStory.update({
    where: { id: story.id },
    data: {
      approvalToken,
      approvalTokenExpiresAt: approvalExpiresAt,
      ownershipStatus: "PENDING_TRANSFER",
      originalCreatorId: story.originalCreatorId ?? session.user.id,
      originalCreatorProfileId: story.originalCreatorProfileId ?? creatorProfile?.id ?? null,
      submittedAt,
      transferConsentAt: submittedAt,
      transferConsentIp: ipAddress,
      transferConsentUserAgent: userAgent,
      creditText,
    },
  })

  await prisma.storyAuditLog.create({
    data: {
      storyId: story.id,
      actorId: session.user.id,
      action: "SUBMITTED_FOR_APPROVAL",
      metadata: {
        ownershipAcknowledgement,
        previousOwnershipStatus: story.ownershipStatus,
      },
    },
  })

  const links = buildStoryApprovalLinks(story.slug, version.id, approvalToken)
  let emailStatus: { delivered: boolean; message?: string } = { delivered: false }

  if (!isMailerConfigured()) {
    emailStatus = {
      delivered: false,
      message:
        "Mailer configuration missing. Set SMTP_HOST/PORT/USER/PASS, MAIL_FROM_ADDRESS, ADMIN_APPROVAL_EMAIL, and APP_BASE_URL to enable email notifications.",
    }
    console.warn("[story-publish] Approval email skipped:", emailStatus.message)
  } else {
    try {
      await sendStorySubmissionEmail({
        storyTitle: story.title,
        storySlug: story.slug,
        versionId: version.id,
        versionNumber: version.versionNumber,
        submitterEmail: session.user.email,
        submitterUsername: session.user.username,
        approveUrl: links.approveUrl,
        rejectUrl: links.rejectUrl,
        previewUrl: links.previewUrl,
      })
      emailStatus = { delivered: true }
    } catch (error) {
      console.error("[story-publish] Failed to send approval email:", error)
      return NextResponse.json(
        {
          error:
            "Story submitted but approval email could not be sent. Please verify SMTP configuration and try again.",
        },
        { status: 502 },
      )
    }
  }

  return NextResponse.json(
    {
      versionId: version.id,
      status: version.status,
      email: emailStatus,
    },
    { status: 201 },
  )
}
