import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/server/prisma", () => {
  const storyVersion = {
    findUnique: vi.fn(),
  }
  return {
    prisma: {
      storyVersion,
    },
  }
})

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/server/story-approval", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/story-approval")>("@/lib/server/story-approval")
  return {
    ...actual,
    applyStoryApprovalDecision: vi.fn(),
  }
})

const { prisma } = await import("@/lib/server/prisma")
const { getCurrentSession } = await import("@/lib/server/auth")
const { applyStoryApprovalDecision } = await import("@/lib/server/story-approval")
const { GET, POST } = await import("@/app/api/creator/stories/publish/decision/route")

const prismaMock = prisma as unknown as {
  storyVersion: {
    findUnique: ReturnType<typeof vi.fn>
  }
}

const getCurrentSessionMock = getCurrentSession as unknown as Mock
const applyStoryApprovalDecisionMock = applyStoryApprovalDecision as unknown as Mock

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("/api/creator/stories/publish/decision", () => {
  it("returns 400 for malformed requests", async () => {
    const response = await GET(new Request("http://localhost/api/creator/stories/publish/decision"))
    expect(response.status).toBe(400)
  })

  it("allows token-based approval via GET links", async () => {
    prismaMock.storyVersion.findUnique.mockResolvedValueOnce({
      id: "version-1",
      storyId: "story-1",
      story: { id: "story-1", slug: "example-story" },
      status: "PENDING",
      metadata: { approvalToken: "token-123" },
    })
    applyStoryApprovalDecisionMock.mockResolvedValueOnce({
      ok: true,
      versionId: "version-1",
      storyId: "story-1",
      storySlug: "example-story",
      status: "APPROVED",
      versionNumber: 2,
      reviewedAt: new Date(),
    })

    const response = await GET(
      new Request(
        "http://localhost/api/creator/stories/publish/decision?versionId=version-1&decision=approve&token=token-123",
      ),
    )

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toContain("approved")
    expect(applyStoryApprovalDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: "version-1",
        decision: "approve",
        tokenUsed: true,
      }),
    )
  })

  it("rejects mismatched tokens", async () => {
    prismaMock.storyVersion.findUnique.mockResolvedValueOnce({
      id: "version-1",
      storyId: "story-1",
      story: { id: "story-1", slug: "example-story" },
      status: "PENDING",
      metadata: { approvalToken: "token-123" },
    })

    const response = await GET(
      new Request(
        "http://localhost/api/creator/stories/publish/decision?versionId=version-1&decision=approve&token=wrong",
      ),
    )

    expect(response.status).toBe(403)
    const text = await response.text()
    expect(text).toContain("no longer valid")
    expect(applyStoryApprovalDecisionMock).not.toHaveBeenCalled()
  })

  it("permits admins to approve via POST without tokens", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "admin-1", role: "ADMIN" },
    })
    prismaMock.storyVersion.findUnique.mockResolvedValueOnce({
      id: "version-1",
      storyId: "story-1",
      story: { id: "story-1", slug: "example-story" },
      status: "PENDING",
      metadata: {},
    })
    applyStoryApprovalDecisionMock.mockResolvedValueOnce({
      ok: true,
      versionId: "version-1",
      storyId: "story-1",
      storySlug: "example-story",
      status: "REJECTED",
      versionNumber: 3,
      reviewedAt: new Date(),
    })

    const response = await POST(
      new Request("http://localhost/api/creator/stories/publish/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId: "version-1", decision: "reject", notes: "Needs more context" }),
      }),
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toMatchObject({
      ok: true,
      status: "REJECTED",
      versionId: "version-1",
    })
    expect(applyStoryApprovalDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewerId: "admin-1",
        notes: "Needs more context",
        decision: "reject",
        tokenUsed: false,
      }),
    )
  })
})
