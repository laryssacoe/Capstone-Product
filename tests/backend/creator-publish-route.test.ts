import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/server/prisma", () => {
  const twineStory = {
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const storyNode = {
    findMany: vi.fn(),
  }
  const storyPath = {
    findMany: vi.fn(),
  }
  const storyTransition = {
    findMany: vi.fn(),
  }
  const storyVersion = {
    create: vi.fn(),
  }
  const creatorProfile = {
    findUnique: vi.fn(),
  }
  const userProfile = {
    findUnique: vi.fn(),
  }
  const user = {
    findUnique: vi.fn(),
  }
  const storyAuditLog = {
    create: vi.fn(),
  }

  return {
    prisma: {
      twineStory,
      storyNode,
      storyPath,
      storyTransition,
      storyVersion,
      creatorProfile,
      userProfile,
      user,
      storyAuditLog,
    },
  }
})

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/server/mailer", () => ({
  isMailerConfigured: vi.fn(),
  sendStorySubmissionEmail: vi.fn(),
  buildStoryApprovalLinks: vi.fn(),
}))

const { prisma } = await import("@/lib/server/prisma")
const { getCurrentSession } = await import("@/lib/server/auth")
const { isMailerConfigured, sendStorySubmissionEmail, buildStoryApprovalLinks } = await import("@/lib/server/mailer")
const { POST } = await import("@/app/api/creator/stories/publish/route")

const prismaMock = prisma as unknown as {
  twineStory: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  storyNode: { findMany: ReturnType<typeof vi.fn> }
  storyPath: { findMany: ReturnType<typeof vi.fn> }
  storyTransition: { findMany: ReturnType<typeof vi.fn> }
  storyVersion: { create: ReturnType<typeof vi.fn> }
  creatorProfile: { findUnique: ReturnType<typeof vi.fn> }
  userProfile: { findUnique: ReturnType<typeof vi.fn> }
  user: { findUnique: ReturnType<typeof vi.fn> }
  storyAuditLog: { create: ReturnType<typeof vi.fn> }
}

const getCurrentSessionMock = getCurrentSession as unknown as Mock
const isMailerConfiguredMock = isMailerConfigured as unknown as Mock
const sendStorySubmissionEmailMock = sendStorySubmissionEmail as unknown as Mock
const buildStoryApprovalLinksMock = buildStoryApprovalLinks as unknown as Mock

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/creator/stories/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ownershipAcknowledgement: { transfer: true, contact: true },
      ...body,
    }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  prismaMock.creatorProfile.findUnique.mockResolvedValue(null)
  prismaMock.userProfile.findUnique.mockResolvedValue(null)
  prismaMock.user.findUnique.mockResolvedValue({ username: "creator", email: "creator@example.com" })
  prismaMock.twineStory.update.mockResolvedValue({})
  prismaMock.storyAuditLog.create.mockResolvedValue({})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/creator/stories/publish", () => {
  it("requires authentication", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)
    const response = await POST(buildRequest({ slug: "story" }))
    expect(response.status).toBe(401)
  })

  it("requires creator privileges", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CONSUMER" },
    })

    const response = await POST(buildRequest({ slug: "story" }))
    expect(response.status).toBe(403)
  })

  it("returns 404 when the story is missing", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: "cp-1",
      status: "ACTIVE",
      completedAt: new Date(),
    })
    prismaMock.twineStory.findUnique.mockResolvedValueOnce(null)

    const response = await POST(buildRequest({ slug: "missing" }))
    expect(response.status).toBe(404)
  })

  it("returns 403 when creator profile is incomplete", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: "cp-1",
      status: "DRAFT",
      completedAt: null,
    })

    const response = await POST(buildRequest({ slug: "story-1" }))
    expect(response.status).toBe(403)
  })

  it("creates a pending version and sends approval email", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR", email: "creator@example.com", username: "creator" },
    })

    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: "cp-1",
      status: "ACTIVE",
      completedAt: new Date(),
      penName: "Creator Name",
    })
    prismaMock.userProfile.findUnique.mockResolvedValueOnce({
      displayName: "Creator Display",
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      slug: "story-1",
      title: "Story 1",
      summary: "Summary",
      tags: ["tag"],
      visibility: "PRIVATE",
      ownerId: "user-1",
      versions: [{ id: "v1", versionNumber: 1 }],
    })
    prismaMock.storyNode.findMany.mockResolvedValueOnce([{ id: "node-1", key: "start" }])
    prismaMock.storyPath.findMany.mockResolvedValueOnce([{ id: "path-1", key: "path" }])
    prismaMock.storyTransition.findMany.mockResolvedValueOnce([{ id: "tran-1", fromNodeId: "node-1", pathId: "path-1" }])
    prismaMock.storyVersion.create.mockResolvedValueOnce({
      id: "version-2",
      versionNumber: 2,
      status: "PENDING",
    })
    isMailerConfiguredMock.mockReturnValueOnce(true)
    buildStoryApprovalLinksMock.mockReturnValueOnce({
      approveUrl: "https://example.com/approve",
      rejectUrl: "https://example.com/reject",
      previewUrl: "https://example.com/preview",
    })

    const response = await POST(buildRequest({ slug: "story-1" }))

    expect(response.status).toBe(201)
    expect(prismaMock.storyVersion.create).toHaveBeenCalled()
    expect(isMailerConfiguredMock).toHaveBeenCalledTimes(1)
    expect(sendStorySubmissionEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storyTitle: "Story 1",
        storySlug: "story-1",
        versionId: "version-2",
        versionNumber: 2,
        approveUrl: "https://example.com/approve",
      }),
    )
    expect(prismaMock.twineStory.update).toHaveBeenCalled()
    expect(prismaMock.storyAuditLog.create).toHaveBeenCalled()

    const json = await response.json()
    expect(json.email).toEqual({ delivered: true })
  })

  it("responds with helpful message when mailer is not configured", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: "cp-1",
      status: "ACTIVE",
      completedAt: new Date(),
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      slug: "story-1",
      title: "Story 1",
      summary: null,
      tags: [],
      visibility: "PRIVATE",
      ownerId: "user-1",
      versions: [],
    })
    prismaMock.storyNode.findMany.mockResolvedValueOnce([])
    prismaMock.storyPath.findMany.mockResolvedValueOnce([])
    prismaMock.storyTransition.findMany.mockResolvedValueOnce([])
    prismaMock.storyVersion.create.mockResolvedValueOnce({
      id: "version-1",
      versionNumber: 1,
      status: "PENDING",
    })
    isMailerConfiguredMock.mockReturnValueOnce(false)

    const response = await POST(buildRequest({ slug: "story-1" }))

    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.email.delivered).toBe(false)
    expect(json.email.message).toContain("Mailer configuration")
    expect(sendStorySubmissionEmailMock).not.toHaveBeenCalled()
    expect(prismaMock.twineStory.update).toHaveBeenCalled()
  })
})
