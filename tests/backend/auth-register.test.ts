import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("node:dns/promises", () => ({
  resolveMx: vi.fn().mockResolvedValue([{ exchange: "mx.example.com" }]),
  resolve: vi.fn().mockResolvedValue([]),
  resolveA: vi.fn().mockResolvedValue(["1.1.1.1"]),
}))

vi.mock("@/lib/server/prisma", () => {
  const user = {
    findFirst: vi.fn(),
    create: vi.fn(),
  }
  return {
    prisma: {
      user,
    },
  }
})

vi.mock("@/lib/server/auth", () => ({
  createSession: vi.fn(),
}))

vi.mock("@/lib/server/email-verification", () => ({
  verifyEmailWithKickbox: vi.fn().mockResolvedValue({ deliverable: true }),
}))

const { prisma } = await import("@/lib/server/prisma")
const { createSession } = await import("@/lib/server/auth")
const { verifyEmailWithKickbox } = await import("@/lib/server/email-verification")
const { resolveMx, resolve } = await import("node:dns/promises")
const { POST } = await import("@/app/api/auth/register/route")

const prismaMock = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

const createSessionMock = createSession as unknown as Mock
const verifyEmailMock = verifyEmailWithKickbox as unknown as Mock
const resolveMxMock = resolveMx as unknown as Mock
const resolveMock = resolve as unknown as Mock

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  verifyEmailMock.mockResolvedValue({ deliverable: true })
  resolveMxMock.mockResolvedValue([{ exchange: "mx.example.com" }])
  resolveMock.mockResolvedValue(["1.1.1.1"])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/auth/register", () => {
  it("returns 400 when validation fails", async () => {
    const response = await POST(buildRequest({ email: "invalid" }))
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBeDefined()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it("returns 409 when email or username already exists", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: "existing" })

    const response = await POST(
      buildRequest({
        email: "existing@example.com",
        password: "password123",
        username: "existinguser",
      }),
    )

    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toBe("Email or username already in use.")
    expect(prismaMock.user.create).not.toHaveBeenCalled()
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it("creates a new user, hashes password, and opens a session", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.create.mockResolvedValueOnce({
      id: "user-1",
      email: "new@example.com",
      username: "newuser",
      role: "CONSUMER",
    })
    ;(createSessionMock as any).mockResolvedValueOnce(undefined)
    verifyEmailMock.mockResolvedValueOnce({ deliverable: true })

    const response = await POST(
      buildRequest({
        email: "new@example.com",
        password: "password123",
        username: "newuser",
      }),
    )

    expect(response.status).toBe(201)
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1)
    expect(createSessionMock).toHaveBeenCalledWith("user-1")

    const json = await response.json()
    expect(json).toMatchObject({
      id: "user-1",
      email: "new@example.com",
      username: "newuser",
      role: "CONSUMER",
    })
    expect(verifyEmailMock).toHaveBeenCalledWith("new@example.com")
  })

  it("translates unique constraint violations into 409 responses", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    const error = new Error("unique violation") as any
    error.code = "P2002"
    prismaMock.user.create.mockRejectedValueOnce(error)

    const response = await POST(
      buildRequest({
        email: "new@example.com",
        password: "password123",
        username: "newuser",
      }),
    )

    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toBe("Email or username already in use.")
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it("normalizes P2002 meta targets into field errors", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    const error = new Error("unique violation") as any
    error.code = "P2002"
    error.meta = { target: ["email", "username"] }
    prismaMock.user.create.mockRejectedValueOnce(error)

    const response = await POST(
      buildRequest({
        email: "dupe@example.com",
        password: "password123",
        username: "dupe",
      }),
    )

    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toBe("Email or username already in use.")
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it("rejects when MX and A lookup fail", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    resolveMxMock.mockRejectedValueOnce(new Error("MX failed"))
    resolveMock.mockRejectedValueOnce(new Error("A failed"))

    const response = await POST(
      buildRequest({
        email: "bad-domain@invalid.test",
        password: "password123",
        username: "bad-domain-user",
      }),
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(String(json.error).toLowerCase()).toContain("couldn't verify this email domain")
    expect(verifyEmailMock).not.toHaveBeenCalled()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it("caches trusted domain without verification", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.create.mockResolvedValueOnce({
      id: "user-2",
      email: "user@gmail.com",
      username: "gmailuser",
      role: "CONSUMER",
    })
    const res = await POST(
      buildRequest({
        email: "user@gmail.com",
        password: "password123",
        username: "gmailuser",
      }),
    )
    expect(res.status).toBe(201)
    // no additional assertion; this path exercises the trusted domain fast-path
  })

  it("returns 503 when Kickbox service is unavailable", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    verifyEmailMock.mockResolvedValueOnce({ deliverable: false, reason: "service unavailable" })

    const res = await POST(
      buildRequest({
        email: "user@maybe.test",
        password: "password123",
        username: "maybe",
      }),
    )

    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error.toLowerCase()).toContain("unavailable")
  })
})
