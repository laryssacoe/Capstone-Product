import { NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"

interface Params {
  params: {
    versionId: string
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return { ...(value as Record<string, unknown>) }
}

export async function GET(request: Request, { params }: Params) {
  const { versionId } = params
  if (!versionId) {
    return NextResponse.json({ error: "Missing version id." }, { status: 400 })
  }

  const url = new URL(request.url)
  const token = url.searchParams.get("token") ?? undefined
  const session = await getCurrentSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const version = await prisma.storyVersion.findUnique({
    where: { id: versionId },
    include: {
      story: {
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          tags: true,
          visibility: true,
          creditText: true,
          ownershipStatus: true,
          submittedAt: true,
          approvalToken: true,
          approvalTokenExpiresAt: true,
          transferConsentAt: true,
          transferConsentIp: true,
          transferConsentUserAgent: true,
          ownerId: true,
          owner: {
            select: { id: true, username: true, email: true },
          },
          originalCreatorId: true,
          originalCreator: {
            select: { id: true, username: true, email: true },
          },
          originalCreatorProfile: {
            select: {
              id: true,
              penName: true,
              headline: true,
              biography: true,
              status: true,
              contactEmail: true,
              portfolioUrl: true,
            },
          },
        },
      },
      author: {
        select: { id: true, username: true, email: true },
      },
    },
  })

  if (!version) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 })
  }

  const metadata = toRecord(version.metadata)
  const storedToken = typeof metadata.approvalToken === "string" ? metadata.approvalToken : undefined
  const storyToken =
    typeof version.story?.approvalToken === "string" ? version.story.approvalToken : undefined

  const tokenMatches = token && (token === storedToken || token === storyToken)

  if (!isAdmin) {
    if (!tokenMatches) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
    }
    if (
      version.story?.approvalTokenExpiresAt &&
      version.story.approvalTokenExpiresAt < new Date()
    ) {
      return NextResponse.json({ error: "This approval link has expired." }, { status: 403 })
    }
  }

  delete metadata.approvalToken

  return NextResponse.json({
    version: {
      id: version.id,
      status: version.status,
      versionNumber: version.versionNumber,
      ownershipStatus: version.ownershipStatus,
      submittedAt: version.submittedAt,
      reviewedAt: version.reviewedAt,
      changelog: version.changelog,
      consentSnapshot: version.consentSnapshot,
      metadata,
      content: version.content,
    },
    story: {
      ...version.story,
      approvalToken: undefined,
      approvalTokenExpiresAt: version.story.approvalTokenExpiresAt,
    },
    author: version.author,
    permissions: {
      canModerate: Boolean(isAdmin || tokenMatches),
    },
  })
}
