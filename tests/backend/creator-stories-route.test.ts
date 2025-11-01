import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/server/prisma", () => {
  const twineStory = {
    findMany: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const storyNode = {
    deleteMany: vi.fn(),
    create: vi.fn(),
  }
  const storyPath = {
    deleteMany: vi.fn(),
    create: vi.fn(),
  }
  const storyTransition = {
    deleteMany: vi.fn(),
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

  return {
    prisma: {
      twineStory,
      storyNode,
      storyPath,
      storyTransition,
      creatorProfile,
      userProfile,
      user,
    },
  }
})

describe("/api/creator/stories DELETE", () => {
  it("requires authentication", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)
    const response = await DELETE(buildDeleteRequest({ slug: "story" }))
    expect(response.status).toBe(401)
  })

  it("returns 404 when the story does not exist", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({ user: { id: "user-1", role: "CREATOR" } })
    prismaMock.twineStory.findUnique.mockResolvedValueOnce(null)

    const response = await DELETE(buildDeleteRequest({ slug: "missing" }))
    expect(response.status).toBe(404)
  })

  it("prevents deleting someone else's story", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({ user: { id: "user-1", role: "CREATOR" } })
    prismaMock.twineStory.findUnique.mockResolvedValueOnce({ id: "story-1", ownerId: "other-user" })

    const response = await DELETE(buildDeleteRequest({ slug: "story-1" }))
    expect(response.status).toBe(403)
    expect(prismaMock.twineStory.delete).not.toHaveBeenCalled()
  })

  it("deletes a story owned by the creator", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({ user: { id: "user-1", role: "CREATOR" } })
    prismaMock.twineStory.findUnique.mockResolvedValueOnce({ id: "story-1", ownerId: "user-1" })
    prismaMock.twineStory.delete.mockResolvedValueOnce({})

    const response = await DELETE(buildDeleteRequest({ slug: "story-1" }))
    expect(response.status).toBe(204)
    expect(prismaMock.twineStory.delete).toHaveBeenCalledWith({ where: { id: "story-1" } })
  })
})

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

const { prisma } = await import("@/lib/server/prisma")
const { getCurrentSession } = await import("@/lib/server/auth")
const { GET, POST, PUT, DELETE } = await import("@/app/api/creator/stories/route")

const prismaMock = prisma as unknown as {
  twineStory: {
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  storyNode: {
    deleteMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  storyPath: {
    deleteMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  storyTransition: {
    deleteMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  creatorProfile: { findUnique: ReturnType<typeof vi.fn> }
  userProfile: { findUnique: ReturnType<typeof vi.fn> }
  user: { findUnique: ReturnType<typeof vi.fn> }
}

const getCurrentSessionMock = getCurrentSession as unknown as Mock

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/creator/stories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function buildDeleteRequest(body?: unknown) {
  return new Request("http://localhost/api/creator/stories", {
    method: "DELETE",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function buildPutRequest(body: unknown) {
  return new Request("http://localhost/api/creator/stories", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  prismaMock.twineStory.findUnique.mockResolvedValue(null)
  prismaMock.twineStory.findFirst.mockResolvedValue(null)
  prismaMock.creatorProfile.findUnique.mockResolvedValue(null)
  prismaMock.userProfile.findUnique.mockResolvedValue(null)
  prismaMock.user.findUnique.mockResolvedValue({ username: "creator", email: "creator@example.com" })
  prismaMock.twineStory.update.mockResolvedValue({
    id: "story-1",
    slug: "story-slug",
    title: "Story Title",
    summary: "Summary",
    tags: ["tag"],
    visibility: "PRIVATE",
  })
  prismaMock.storyNode.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.storyPath.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.storyTransition.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.storyNode.create.mockImplementation(async ({ data }) => ({ id: `${data.key}-id` }))
  prismaMock.storyPath.create.mockImplementation(async ({ data }) => ({ id: `${data.key}-id` }))
  prismaMock.storyTransition.create.mockImplementation(async () => ({ id: "transition-id" }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("/api/creator/stories GET", () => {
  it("rejects unauthenticated access", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it("returns stories with derived review status", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    })

    prismaMock.twineStory.findMany.mockResolvedValueOnce([
      {
        id: "story-1",
        slug: "story-one",
        title: "Story One",
        summary: null,
        tags: ["empathy"],
        visibility: "PRIVATE",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
        nodes: [{ id: "node-1", key: "start", title: null, synopsis: null, type: "NARRATIVE", content: null, media: null }],
        paths: [{ id: "path-1", key: "path", label: "Next", summary: null, metadata: null }],
        transitions: [
          { id: "tran-1", fromNodeId: "node-1", toNodeId: null, pathId: "path-1", ordering: 0, condition: null, effect: null },
        ],
        versions: [
          { id: "v2", status: "PENDING", versionNumber: 2, submittedAt: new Date("2024-01-04"), reviewedAt: null },
          { id: "v1", status: "APPROVED", versionNumber: 1, submittedAt: new Date("2024-01-03"), reviewedAt: new Date("2024-01-04") },
        ],
        latestVersion: { id: "v1", status: "APPROVED", versionNumber: 1, submittedAt: new Date("2024-01-03"), reviewedAt: new Date("2024-01-04") },
      },
    ])

    const response = await GET()
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.stories).toHaveLength(1)
    expect(json.stories[0]).toMatchObject({
      id: "story-1",
      slug: "story-one",
      reviewStatus: "PENDING",
      reviewVersionNumber: 2,
    })
  })
})

describe("/api/creator/stories POST", () => {
  const validPayload = {
    slug: "new-story",
    title: "New Story",
    summary: "Summary",
    tags: ["tag1"],
    visibility: "PRIVATE",
    nodes: [{ key: "start", title: "Start", type: "NARRATIVE" }],
    paths: [{ key: "path-1", label: "Continue" }],
    transitions: [{ from: "start", to: null, path: "path-1", ordering: 0 }],
  }

  it("rejects unauthenticated users", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)
    const response = await POST(buildRequest(validPayload))
    expect(response.status).toBe(401)
  })

  it("rejects non-creator roles", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CONSUMER" },
    })

    const response = await POST(buildRequest(validPayload))
    expect(response.status).toBe(403)
    expect(prismaMock.twineStory.upsert).not.toHaveBeenCalled()
  })

  it("creates or updates a story graph for creators", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({ id: "story-123", ownerId: "user-1" })
    prismaMock.twineStory.findFirst.mockResolvedValueOnce(null)
    prismaMock.twineStory.upsert.mockResolvedValueOnce({
      id: "story-123",
      slug: "new-story",
    })
    prismaMock.storyNode.create.mockResolvedValueOnce({ id: "node-1" })
    prismaMock.storyPath.create.mockResolvedValueOnce({ id: "path-1" })
    prismaMock.storyTransition.create.mockResolvedValueOnce({ id: "transition-1" })

    const response = await POST(buildRequest(validPayload))

    expect(response.status).toBe(201)
    expect(prismaMock.twineStory.findUnique).toHaveBeenCalledWith({
      where: { slug: "new-story" },
      select: { id: true, ownerId: true },
    })
    expect(prismaMock.twineStory.findFirst).toHaveBeenCalledWith({
      where: {
        title: "New Story",
        NOT: {
          slug: "new-story",
        },
      },
      select: { id: true },
    })
    expect(prismaMock.twineStory.upsert).toHaveBeenCalledTimes(1)
    expect(prismaMock.storyNode.deleteMany).toHaveBeenCalledWith({ where: { storyId: "story-123" } })
    expect(prismaMock.storyPath.deleteMany).toHaveBeenCalledWith({ where: { storyId: "story-123" } })
    expect(prismaMock.storyTransition.deleteMany).toHaveBeenCalledWith({ where: { storyId: "story-123" } })
    expect(prismaMock.storyNode.create).toHaveBeenCalled()
    expect(prismaMock.storyPath.create).toHaveBeenCalled()
    expect(prismaMock.storyTransition.create).toHaveBeenCalled()
  })

  it("rejects duplicate titles", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce(null)
    prismaMock.twineStory.findFirst.mockResolvedValueOnce({ id: "existing" })

    const response = await POST(buildRequest(validPayload))
    expect(response.status).toBe(409)
    expect(prismaMock.twineStory.upsert).not.toHaveBeenCalled()
  })

  it("rejects duplicate slugs owned by another creator", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({ id: "story-existing", ownerId: "other-user" })

    const response = await POST(buildRequest(validPayload))
    expect(response.status).toBe(409)
    expect(prismaMock.twineStory.upsert).not.toHaveBeenCalled()
  })
})

describe("/api/creator/stories PUT", () => {
  const basePayload = {
    storyId: "story-1",
    slug: "story-slug",
    title: "Updated Story",
    summary: "Updated summary",
    tags: ["empathy"],
    visibility: "PRIVATE" as const,
    nodes: [{ key: "start", title: "Start", type: "NARRATIVE" as const }],
    paths: [{ key: "path-1", label: "Continue" }],
    transitions: [{ from: "start", to: null, path: "path-1", ordering: 0 }],
  }

  it("rejects unauthenticated users", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)

    const response = await PUT(buildPutRequest(basePayload))
    expect(response.status).toBe(401)
  })

  it("rejects non-creator roles", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CONSUMER" },
    })

    const response = await PUT(buildPutRequest(basePayload))
    expect(response.status).toBe(403)
  })

  it("returns 404 when the story is missing", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })
    prismaMock.twineStory.findUnique.mockResolvedValueOnce(null)

    const response = await PUT(buildPutRequest(basePayload))
    expect(response.status).toBe(404)
  })

  it("prevents editing someone else's story for non-admins", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR", isAdmin: false },
    })
    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      ownerId: "other-user",
      slug: "story-slug",
    })

    const response = await PUT(buildPutRequest(basePayload))
    expect(response.status).toBe(403)
  })

  it("rejects slug conflicts", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR", isAdmin: false },
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      ownerId: "user-1",
      slug: "original-slug",
    })
    prismaMock.twineStory.findUnique.mockResolvedValueOnce({ id: "story-2" })

    const response = await PUT(buildPutRequest({ ...basePayload, slug: "new-slug" }))
    expect(response.status).toBe(409)
  })

  it("rejects duplicate titles", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      ownerId: "user-1",
      slug: "story-slug",
    })
    prismaMock.twineStory.findFirst.mockResolvedValueOnce({ id: "story-2" })

    const response = await PUT(buildPutRequest({ ...basePayload, title: "Conflicting" }))
    expect(response.status).toBe(409)
  })

  it("updates a story owned by the creator", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      ownerId: "user-1",
      slug: "story-slug",
    })
    prismaMock.twineStory.findFirst.mockResolvedValueOnce(null)
    prismaMock.storyNode.create.mockResolvedValueOnce({ id: "node-1" })
    prismaMock.storyPath.create.mockResolvedValueOnce({ id: "path-1" })
    prismaMock.storyTransition.create.mockResolvedValueOnce({ id: "transition-1" })

    const response = await PUT(buildPutRequest(basePayload))
    expect(response.status).toBe(200)
    expect(prismaMock.twineStory.update).toHaveBeenCalledWith({
      where: { id: "story-1" },
      data: expect.objectContaining({
        slug: "story-slug",
        title: "Updated Story",
        summary: "Updated summary",
      }),
    })
    expect(prismaMock.storyNode.deleteMany).toHaveBeenCalledWith({ where: { storyId: "story-1" } })
    expect(prismaMock.storyPath.deleteMany).toHaveBeenCalledWith({ where: { storyId: "story-1" } })
    expect(prismaMock.storyTransition.deleteMany).toHaveBeenCalledWith({ where: { storyId: "story-1" } })
  })

  it("lets admins edit stories they do not own", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "admin-1", role: "ADMIN", isAdmin: true },
    })

    prismaMock.twineStory.findUnique.mockResolvedValueOnce({
      id: "story-1",
      ownerId: "creator-2",
      slug: "story-slug",
    })
    prismaMock.twineStory.findFirst.mockResolvedValueOnce(null)

    const response = await PUT(buildPutRequest(basePayload))
    expect(response.status).toBe(200)
    expect(prismaMock.twineStory.update).toHaveBeenCalled()
  })
})
