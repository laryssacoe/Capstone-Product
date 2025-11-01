import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}))

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

const { prisma } = await import("@/lib/server/prisma")
const { getCurrentSession } = await import("@/lib/server/auth")
const { POST } = await import("@/app/api/creator/upgrade/route")

const prismaMock = prisma as unknown as {
  user: {
    update: ReturnType<typeof vi.fn>
  }
}

const getCurrentSessionMock = getCurrentSession as unknown as Mock

beforeEach(() => {
  vi.resetAllMocks()
})

describe("/api/creator/upgrade POST", () => {
  it("requires authentication", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)

    const response = await POST()
    expect(response.status).toBe(401)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it("returns a noop message if already creator", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", role: "CREATOR" },
    })

    const response = await POST()
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({ message: "Already upgraded." })
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it("promotes consumer accounts to creator", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-1",
        role: "CONSUMER",
        username: "consumer",
        email: "consumer@example.com",
      },
    })

    prismaMock.user.update.mockResolvedValueOnce({
      id: "user-1",
      role: "CREATOR",
      email: "consumer@example.com",
      username: "consumer",
    })

    const response = await POST()
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        role: "CREATOR",
        profile: {
          upsert: {
            update: {
              consentAcceptedAt: expect.any(Date),
            },
            create: {
              consentAcceptedAt: expect.any(Date),
              displayName: "consumer",
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    })
    expect(json).toEqual({
      user: {
        id: "user-1",
        role: "CREATOR",
        email: "consumer@example.com",
        username: "consumer",
      },
    })
  })
})
