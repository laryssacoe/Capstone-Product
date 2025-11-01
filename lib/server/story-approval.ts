import type { Prisma } from "@/src/generated/prisma/client"

import { prisma } from "./prisma"

export type StoryApprovalDecision = "approve" | "reject"

type StoryVersionWithStory = Prisma.StoryVersionGetPayload<{
  include: { story: true }
}>

function toMetadataRecord(metadata: Prisma.JsonValue | null | undefined): Record<string, any> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {}
  }
  return { ...(metadata as Record<string, any>) }
}

export function extractApprovalToken(metadata: Prisma.JsonValue | null | undefined): string | undefined {
  const record = toMetadataRecord(metadata)
  const token = record.approvalToken
  return typeof token === "string" && token.length > 0 ? token : undefined
}

export interface ApplyStoryApprovalArgs {
  versionId: string
  decision: StoryApprovalDecision
  reviewerId?: string | null
  notes?: string | null
  tokenUsed?: boolean
  version?: StoryVersionWithStory
}

export interface StoryApprovalResult {
  ok: true
  versionId: string
  storyId: string
  storySlug: string
  status: "APPROVED" | "REJECTED"
  versionNumber: number
  reviewedAt: Date
}

export interface StoryApprovalError {
  ok: false
  statusCode: number
  message: string
}

const isStoryApprovalError = (value: StoryApprovalResult | StoryApprovalError): value is StoryApprovalError =>
  value.ok === false

export async function applyStoryApprovalDecision(args: ApplyStoryApprovalArgs): Promise<StoryApprovalResult | StoryApprovalError> {
  // ...existing code...
  const {
    versionId,
    decision,
    reviewerId = null,
    notes = null,
    tokenUsed = false,
    version: preload,
  } = args

  const decisionStatus = decision === "approve" ? "APPROVED" : "REJECTED"
  const reviewedAt = new Date()

  const version =
    preload ??
    (await prisma.storyVersion.findUnique({
      where: { id: versionId },
      include: { story: true },
    }))

  if (!version) {
    return { ok: false, statusCode: 404, message: "Story version not found." }
  }

  if (version.status === "APPROVED" || version.status === "REJECTED") {
    return {
      ok: false,
      statusCode: 409,
      message: `Version already ${version.status.toLowerCase()}.`,
    }
  }

  const metadata = toMetadataRecord(version.metadata)
  metadata.approvalToken = null
  metadata.approvalDecision = decisionStatus
  metadata.approvalDecisionAt = reviewedAt.toISOString()
  metadata.approvalNotes = notes
  metadata.approvalReviewedVia = reviewerId ? "SESSION" : tokenUsed ? "TOKEN" : metadata.approvalReviewedVia ?? "UNKNOWN"
  if (reviewerId) {
    metadata.approvalReviewerId = reviewerId
  }
  if (tokenUsed) {
    metadata.approvalTokenUsedAt = reviewedAt.toISOString()
  }

  const updated = await prisma.storyVersion.update({
    where: { id: version.id },
    data: {
      status: decisionStatus,
      reviewerId,
      reviewedAt,
      metadata,
      changelog:
        decision === "approve"
          ? version.changelog ?? "Approved via admin action"
          : version.changelog ?? "Rejected via admin action",
      ownershipStatus: decision === "approve" ? "PLATFORM_OWNED" : "RETURNED",
    },
    select: {
      id: true,
      versionNumber: true,
      status: true,
      storyId: true,
    },
  })

  // Send email to creator on approval/rejection
  try {
    // Fetch creator profile and user for email
    const story = version.story
    const creatorProfile = story?.originalCreatorProfileId
      ? await prisma.creatorProfile.findUnique({ where: { id: story.originalCreatorProfileId } })
      : null
    const creatorUser = story?.originalCreatorId
      ? await prisma.user.findUnique({ where: { id: story.originalCreatorId } })
      : null
    const creatorEmail = creatorProfile?.contactEmail || creatorUser?.email
    if (creatorEmail) {
      const { default: nodemailer } = await import("nodemailer")
      const mailerConfig = (await import("./mailer")).resolveMailerConfig()
      if (!mailerConfig) {
        console.warn("[story-approval] Mailer not configured; skipping creator notification email")
      } else {
        const { host, port, user, pass, secure, fromAddress } = mailerConfig
        const transporter = nodemailer.createTransport({
          host,
          port,
          auth: { user, pass },
          secure,
        })
        const subject = decision === "approve"
          ? `Your story "${story.title}" has been approved`
          : `Your story "${story.title}" has been rejected`
        const textBody = decision === "approve"
          ? `Congratulations! Your story "${story.title}" (slug: ${story.slug}) has been approved and is now live on the platform.`
          : `We're sorry, but your story "${story.title}" (slug: ${story.slug}) was not approved. Please review any feedback and try again.`
        await transporter.sendMail({
          from: fromAddress,
          to: creatorEmail,
          subject,
          text: textBody,
        })
      }
    }
  } catch (err) {
    // Log but do not block approval
    console.error("[story-approval] Failed to send creator notification email", err)
  }

  const storyUpdate: Prisma.TwineStoryUpdateArgs["data"] = {
    approvalToken: null,
    approvalTokenExpiresAt: null,
    reviewComment: notes ?? version.story.reviewComment ?? null,
  }

  if (decision === "approve") {
    storyUpdate.latestVersionId = version.id
    storyUpdate.ownershipStatus = "PLATFORM_OWNED"
    storyUpdate.approvedAt = reviewedAt
    storyUpdate.approvedById = reviewerId ?? version.story.ownerId ?? null
    storyUpdate.visibility = "PUBLIC"
  } else {
    storyUpdate.ownershipStatus = "RETURNED"
  }

  await prisma.twineStory.update({
    where: { id: version.storyId },
    data: storyUpdate,
  })

  if (decision === "approve") {
    try {
      await prisma.avatarProfile.updateMany({
        where: { storyId: version.storyId },
        data: { isPlayable: true },
      })
    } catch (avatarError) {
      console.warn(
        "[story-approval] Failed to enable avatars for approved story",
        {
          storyId: version.storyId,
          error: avatarError,
        },
      )
    }
  }

  await prisma.storyAuditLog.create({
    data: {
      storyId: version.storyId,
      actorId: reviewerId ?? null,
      action: decision === "approve" ? "APPROVED" : "REJECTED",
      note: notes ?? null,
      metadata: {
        versionId,
        via: reviewerId ? "SESSION" : tokenUsed ? "TOKEN" : "UNKNOWN",
      },
    },
  })

  return {
    ok: true,
    versionId: updated.id,
    storyId: version.story.id,
    storySlug: version.story.slug,
    status: decisionStatus as "APPROVED" | "REJECTED",
    versionNumber: updated.versionNumber,
    reviewedAt,
  }
}

export { isStoryApprovalError }
