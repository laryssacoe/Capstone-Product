import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/server/bootstrap", () => ({
  ensureBaseContent: vi.fn(),
}))

vi.mock("@/lib/server/progress", () => ({
  getUserProgress: vi.fn(),
}))

const { getCurrentSession } = await import("@/lib/server/auth")
const { ensureBaseContent } = await import("@/lib/server/bootstrap")
const { getUserProgress } = await import("@/lib/server/progress")
const { GET } = await import("@/app/api/progress/route")

const getCurrentSessionMock = getCurrentSession as unknown as Mock
const ensureBaseContentMock = ensureBaseContent as unknown as Mock
const getUserProgressMock = getUserProgress as unknown as Mock

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/progress", () => {
  it("returns 401 when no authenticated session exists", async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(ensureBaseContentMock).not.toHaveBeenCalled()
    expect(getUserProgressMock).not.toHaveBeenCalled()
  })

  it("returns progress payload when the user is signed in", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    })
    ensureBaseContentMock.mockResolvedValueOnce(undefined)
    const progressPayload = { userId: "user-1", scenariosCompleted: 2 }
    getUserProgressMock.mockResolvedValueOnce(progressPayload)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(ensureBaseContentMock).toHaveBeenCalledTimes(1)
    expect(getUserProgressMock).toHaveBeenCalledWith("user-1")

    const json = await response.json()
    expect(json).toEqual(progressPayload)
  })
})
