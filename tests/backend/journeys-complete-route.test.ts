import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock("@/lib/server/bootstrap", () => ({
  ensureBaseContent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/server/progress", () => ({
  completeScenario: vi.fn(),
  getUserProgress: vi.fn().mockResolvedValue({ ok: true }),
}))

const { getCurrentSession } = await import("@/lib/server/auth")
const { completeScenario } = await import("@/lib/server/progress")
const { POST } = await import("@/app/api/journeys/complete/route")

const sessionMock = getCurrentSession as unknown as ReturnType<typeof vi.fn>
const completeScenarioMock = completeScenario as unknown as ReturnType<typeof vi.fn>

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/journeys/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/journeys/complete", () => {
  it("returns 401 when not authenticated", async () => {
    sessionMock.mockResolvedValueOnce(null)
    const res = await POST(buildRequest({ scenarioId: "x" }))
    expect(res.status).toBe(401)
  })

  it("returns 404 when scenario not found", async () => {
    sessionMock.mockResolvedValueOnce({ user: { id: "u1" } })
    completeScenarioMock.mockRejectedValueOnce(new Error("Scenario not found."))

    const res = await POST(buildRequest({ scenarioId: "missing" }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain("Scenario not found")
  })

  it("returns 400 on invalid payload shape", async () => {
    sessionMock.mockResolvedValueOnce({ user: { id: "u1" } })
    const res = await POST(buildRequest({}))
    expect(res.status).toBe(400)
  })
})
