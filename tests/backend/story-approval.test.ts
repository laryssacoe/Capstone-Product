import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/prisma", () => {
  const storyVersion = {
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const twineStory = {
    update: vi.fn(),
  }
  const storyAuditLog = {
    create: vi.fn(),
  }

  return {
    prisma: {
      storyVersion,
      twineStory,
      storyAuditLog,
    },
  }
})

import { prisma } from "@/lib/server/prisma"
import { applyStoryApprovalDecision, extractApprovalToken } from "@/lib/server/story-approval"

type MockVersion = {
  id: string
  storyId: string
  versionNumber: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  changelog?: string | null
  metadata?: Record<string, unknown> | null
  story: {
    id: string
    slug: string
    ownershipStatus?: string
    approvalToken?: string | null
    approvalTokenExpiresAt?: Date | null
    ownerId?: string | null
  }
}

function makeVersion(overrides: Partial<MockVersion> = {}): MockVersion {
  return {
    id: "ver-1",
    storyId: "story-1",
    versionNumber: 1,
    status: "PENDING",
    changelog: "Submitted for approval",
    metadata: { approvalToken: "token-123" },
    story: {
      id: "story-1",
      slug: "sample-story",
      ownershipStatus: "PENDING_TRANSFER",
      approvalToken: "token-123",
      approvalTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ownerId: "owner-1",
    },
    ...overrides,
  }
}

const prismaMock = prisma as unknown as {
  storyVersion: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  twineStory: {
    update: ReturnType<typeof vi.fn>
  }
  storyAuditLog: {
    create: ReturnType<typeof vi.fn>
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("extractApprovalToken", () => {
  it("returns the stored approval token", () => {
    expect(extractApprovalToken({ approvalToken: "abc" })).toBe("abc")
  })

  it("returns undefined when no token exists", () => {
    expect(extractApprovalToken({})).toBeUndefined()
  })
})

describe("applyStoryApprovalDecision", () => {
  it("returns error when the version cannot be found", async () => {
    prismaMock.storyVersion.findUnique.mockResolvedValue(null)

    const result = await applyStoryApprovalDecision({
      versionId: "missing",
      decision: "approve",
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.statusCode).toBe(404)
    }
  })

  it("prevents approving an already reviewed version", async () => {
    prismaMock.storyVersion.findUnique.mockResolvedValue(makeVersion({ status: "APPROVED" }) as any)

    const result = await applyStoryApprovalDecision({
      versionId: "ver-1",
      decision: "approve",
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.statusCode).toBe(409)
    }
  })

  it("approves a pending version and updates the story", async () => {
    const version = makeVersion()
    prismaMock.storyVersion.findUnique.mockResolvedValue(version as any)
    prismaMock.storyVersion.update.mockResolvedValue({
      id: version.id,
      versionNumber: version.versionNumber,
      status: "APPROVED",
      storyId: version.storyId,
    })
    prismaMock.twineStory.update.mockResolvedValue({})
    prismaMock.storyAuditLog.create.mockResolvedValue({})

    const result = await applyStoryApprovalDecision({
      versionId: version.id,
      decision: "approve",
      reviewerId: "admin-1",
      notes: "Looks good",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.status).toBe("APPROVED")
      expect(result.versionNumber).toBe(version.versionNumber)
    }

    const updateArgs = prismaMock.storyVersion.update.mock.calls[0][0]
    expect(updateArgs.data.status).toBe("APPROVED")
    expect(updateArgs.data.reviewerId).toBe("admin-1")
    expect(updateArgs.data.metadata.approvalToken).toBeNull()
    expect(updateArgs.data.metadata.approvalNotes).toBe("Looks good")
    expect(updateArgs.data.ownershipStatus).toBe("PLATFORM_OWNED")

    expect(prismaMock.twineStory.update).toHaveBeenCalledWith({
      where: { id: version.storyId },
      data: expect.objectContaining({
        latestVersionId: version.id,
        ownershipStatus: "PLATFORM_OWNED",
        approvedById: "admin-1",
      }),
    })
    expect(prismaMock.storyAuditLog.create).toHaveBeenCalled()
  })
})
