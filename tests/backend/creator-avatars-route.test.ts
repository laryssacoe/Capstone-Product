import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/server/prisma", () => {
  const userProfile = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  }
  const twineStory = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  }
  const avatarProfile = {
    findMany: vi.fn(),
    upsert: vi.fn(),
  }
  return {
    prisma: {
      userProfile,
      twineStory,
      avatarProfile,
    },
  }
})

const { getCurrentSession } = await import("@/lib/server/auth")
const { prisma } = await import("@/lib/server/prisma")
const { GET, POST } = await import("@/app/api/creator/avatars/route")

const getCurrentSessionMock = getCurrentSession as unknown as Mock
const prismaMock = prisma as unknown as {
  userProfile: {
    findUnique: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  twineStory: {
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
  }
  avatarProfile: {
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("/api/creator/avatars GET", () => {
  it("requires authentication", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it("returns profile, stories, and avatars", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    prismaMock.userProfile.findUnique.mockResolvedValueOnce({ displayName: "Creator" })
    prismaMock.twineStory.findMany.mockResolvedValueOnce([{ id: "story-1", slug: "story", title: "Story" }])
    prismaMock.avatarProfile.findMany.mockResolvedValueOnce([
      {
        id: "avatar-1",
        name: "Avatar",
        background: null,
        avatarUrl: null,
        initialResources: { empathy: 70 },
        isPlayable: true,
        updatedAt: new Date("2024-01-01"),
        story: { slug: "story", title: "Story" },
      },
    ])

    const response = await GET()
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.profile).toEqual({ displayName: "Creator" })
    expect(json.stories).toHaveLength(1)
    expect(json.avatars).toHaveLength(1)
  })
})

describe("/api/creator/avatars POST", () => {
  it("updates creator profile", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({ user: { id: "user-1", role: "CREATOR", username: "creator" } })
    prismaMock.userProfile.upsert.mockResolvedValueOnce({
      userId: "user-1",
      displayName: "Creator Updated",
    })
    const response = await POST(
      new Request("http://localhost/api/creator/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { displayName: "Creator Updated" } }),
      }),
    )

    expect(response.status).toBe(200)
    expect(prismaMock.userProfile.upsert).toHaveBeenCalled()
  })

  it("creates a story avatar", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({ user: { id: "user-1", role: "CREATOR" } })
    prismaMock.twineStory.findFirst.mockResolvedValueOnce({ id: "story-1" })
    prismaMock.avatarProfile.upsert.mockResolvedValueOnce({
      id: "avatar-1",
      name: "Asha",
    })

    const response = await POST(
      new Request("http://localhost/api/creator/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: {
            storySlug: "story",
            name: "Asha",
            initialResources: { empathy: 70 },
          },
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(prismaMock.avatarProfile.upsert).toHaveBeenCalled()
  })
})
