import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/bootstrap", () => ({
  ensureBaseContent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/server/prisma", () => {
  const twineStory = {
    findUnique: vi.fn(),
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
  return {
    prisma: { twineStory, storyNode, storyPath, storyTransition },
  }
})

const { prisma } = await import("@/lib/server/prisma")
const { getCurrentSession } = await import("@/lib/server/auth")
const { GET } = await import("@/app/api/stories/[slug]/graph/route")

const prismaMock = prisma as unknown as {
  twineStory: { findUnique: ReturnType<typeof vi.fn> }
  storyNode: { findMany: ReturnType<typeof vi.fn> }
  storyPath: { findMany: ReturnType<typeof vi.fn> }
  storyTransition: { findMany: ReturnType<typeof vi.fn> }
}

const sessionMock = getCurrentSession as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/stories/[slug]/graph", () => {
  it("returns 403 for private story when requester is not owner", async () => {
    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "s1",
      slug: "story-private",
      title: "Private Story",
      summary: null,
      tags: [],
      visibility: "PRIVATE",
      ownerId: "owner-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    sessionMock.mockResolvedValue({ user: { id: "other-user" } })

    const res = await GET(new Request("http://localhost/api/stories/story-private/graph"), {
      params: { slug: "story-private" },
    })

    expect(res.status).toBe(403)
  })

  it("returns graph for owner even when private", async () => {
    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "s2",
      slug: "story-owner",
      title: "Owner Story",
      summary: "summary",
      tags: [],
      visibility: "PRIVATE",
      ownerId: "owner-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    prismaMock.storyNode.findMany.mockResolvedValueOnce([{ id: "n1" }])
    prismaMock.storyPath.findMany.mockResolvedValueOnce([{ id: "p1" }])
    prismaMock.storyTransition.findMany.mockResolvedValueOnce([{ id: "t1" }])
    sessionMock.mockResolvedValue({ user: { id: "owner-1" } })

    const res = await GET(new Request("http://localhost/api/stories/story-owner/graph"), {
      params: { slug: "story-owner" },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.story.slug).toBe("story-owner")
    expect(json.nodes).toHaveLength(1)
    expect(json.paths).toHaveLength(1)
    expect(json.transitions).toHaveLength(1)
  })
})
