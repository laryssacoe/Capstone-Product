import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/server/prisma", () => {
  const avatarProfile = {
    findFirst: vi.fn(),
    create: vi.fn(),
  }
  const twineStory = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  }
  return {
    prisma: {
      avatarProfile,
      twineStory,
    },
  }
})

vi.mock("@/lib/server/story-graph", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/story-graph")>("@/lib/server/story-graph")
  return {
    ...actual,
    upsertStoryGraph: vi.fn(async (_ownerId, payload) => ({
      id: "story-123",
      slug: payload.slug,
      title: payload.title,
    })),
  }
})

const { getCurrentSession } = await import("@/lib/server/auth")
const { prisma } = await import("@/lib/server/prisma")
const { upsertStoryGraph } = await import("@/lib/server/story-graph")
const { POST } = await import("@/app/api/creator/import/route")

const getCurrentSessionMock = getCurrentSession as unknown as Mock
const upsertStoryGraphMock = upsertStoryGraph as unknown as Mock
const prismaMock = prisma as unknown as {
  avatarProfile: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  twineStory: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  prismaMock.twineStory.findUnique.mockResolvedValue(null)
  prismaMock.twineStory.findFirst.mockResolvedValue(null)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/creator/import", () => {
  it("requires authentication", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)
    const formData = new FormData()
    formData.append("twineFile", new File(["{}"], "story.json", { type: "application/json" }))

    const response = await POST(
      new Request("http://localhost/api/creator/import", {
        method: "POST",
        body: formData,
      }),
    )

    expect(response.status).toBe(401)
  })

  it("converts Twine JSON and upserts a story graph", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })
    prismaMock.avatarProfile.findFirst.mockResolvedValueOnce(null)
    prismaMock.avatarProfile.create.mockResolvedValueOnce({})

    const twison = {
      name: "Import Example",
      passages: [
        { pid: 1, name: "Start", text: "Opening text.", links: [{ name: "Continue", link: "End" }] },
        { pid: 2, name: "End", text: "The conclusion." },
      ],
    }
    const formData = new FormData()
    formData.append("twineFile", new File([JSON.stringify(twison)], "story.json", { type: "application/json" }))

    const response = await POST(
      new Request("http://localhost/api/creator/import", {
        method: "POST",
        body: formData,
      }),
    )

    expect(response.status).toBe(201)
    expect(upsertStoryGraphMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        slug: "import-example",
        nodes: expect.any(Array),
        paths: expect.any(Array),
      }),
    )
    expect(prismaMock.avatarProfile.create).toHaveBeenCalled()

    const json = await response.json()
    expect(json.slug).toBe("import-example")
  })

  it("imports the bundled sample Twine JSON successfully", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-2", role: "CREATOR" },
    })
    prismaMock.avatarProfile.findFirst.mockResolvedValueOnce(null)
    prismaMock.avatarProfile.create.mockResolvedValueOnce({})

    const filePath = resolve(process.cwd(), "public", "twine", "sample-twine-valid.json")
    const fileBuffer = readFileSync(filePath)

    const formData = new FormData()
    formData.append(
      "twineFile",
      new File([fileBuffer], "sample-twine-valid.json", { type: "application/json" }),
    )

    const response = await POST(
      new Request("http://localhost/api/creator/import", {
        method: "POST",
        body: formData,
      }),
    )

    expect(response.status).toBe(201)
    expect(upsertStoryGraphMock).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ slug: "coffee-shop-dilemma" }),
    )

    const json = await response.json()
    expect(json.slug).toBe("coffee-shop-dilemma")
  })

  it("rejects the bundled invalid Twine JSON", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-3", role: "CREATOR" },
    })

    const filePath = resolve(process.cwd(), "public", "twine", "sample-twine-invalid.json")
    const fileBuffer = readFileSync(filePath)

    const formData = new FormData()
    formData.append(
      "twineFile",
      new File([fileBuffer], "sample-twine-invalid.json", { type: "application/json" }),
    )

    const response = await POST(
      new Request("http://localhost/api/creator/import", {
        method: "POST",
        body: formData,
      }),
    )

    expect(response.status).toBe(400)
    expect(upsertStoryGraphMock).not.toHaveBeenCalled()

    const json = await response.json()
    expect(json.error).toMatch(/must include passages/i)
  })
})
