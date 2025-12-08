import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("node:dns/promises", () => ({
  resolveMx: vi.fn().mockResolvedValue([{ exchange: "mx.example.com" }]),
  resolve: vi.fn().mockResolvedValue([]),
  resolveA: vi.fn().mockResolvedValue(["1.1.1.1"]),
}))

vi.mock("@/lib/server/prisma", () => {
  const user = {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
  }
  return { prisma: { user } }
})

vi.mock("@/lib/server/auth", () => ({
  createSession: vi.fn(),
}))

vi.mock("@/lib/server/email-verification", () => ({
  verifyEmailWithKickbox: vi.fn(),
}))

const { prisma } = await import("@/lib/server/prisma")
const { createSession } = await import("@/lib/server/auth")
const { verifyEmailWithKickbox } = await import("@/lib/server/email-verification")
const { POST } = await import("@/app/api/auth/register/route")

const prismaMock = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}
const createSessionMock = createSession as unknown as Mock
const verifyEmailMock = verifyEmailWithKickbox as unknown as Mock

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
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

describe("POST /api/auth/register with Kickbox", () => {
  it("rejects undeliverable email with 400", async () => {
    verifyEmailMock.mockResolvedValueOnce({ deliverable: false, reason: "rejected" })

    const response = await POST(
      buildRequest({
        email: "user@undeliverable.test",
        password: "password123",
        username: "undeliverable",
      }),
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("rejected")
    expect(prismaMock.user.create).not.toHaveBeenCalled()
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it("returns 503 when verification service is unavailable", async () => {
    verifyEmailMock.mockResolvedValueOnce({ deliverable: false, reason: "service unavailable" })

    const response = await POST(
      buildRequest({
        email: "user@maybe.test",
        password: "password123",
        username: "maybe",
      }),
    )

    expect(response.status).toBe(503)
    const json = await response.json()
    expect(json.error.toLowerCase()).toContain("unavailable")
    expect(prismaMock.user.create).not.toHaveBeenCalled()
    expect(createSessionMock).not.toHaveBeenCalled()
  })
})
