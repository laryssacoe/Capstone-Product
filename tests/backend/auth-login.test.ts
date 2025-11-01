import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import bcrypt from "bcryptjs"

vi.mock("@/lib/server/prisma", () => {
  const user = {
    findUnique: vi.fn(),
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

const { prisma } = await import("@/lib/server/prisma")
const { createSession } = await import("@/lib/server/auth")
const { POST } = await import("@/app/api/auth/login/route")

const prismaMock = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
  }
}

const createSessionMock = createSession as unknown as Mock

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
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

describe("POST /api/auth/login", () => {
  it("returns 400 when schema validation fails", async () => {
    const response = await POST(buildRequest({ email: "not-an-email" }))
    expect(response.status).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it("returns 401 when user is not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)

    const response = await POST(
      buildRequest({
        email: "missing@example.com",
        password: "whatever",
      }),
    )

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("Invalid credentials.")
  })

  it("returns 401 when password does not match", async () => {
    const hashed = await bcrypt.hash("correct-password", 10)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      username: "user",
      role: "CONSUMER",
      hashedPassword: hashed,
    })

    const response = await POST(
      buildRequest({
        email: "user@example.com",
        password: "incorrect",
      }),
    )

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("Invalid credentials.")
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it("returns the user and starts a session when credentials are valid", async () => {
    const hashed = await bcrypt.hash("correct-password", 10)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      username: "user",
      role: "CONSUMER",
      hashedPassword: hashed,
    })
    ;(createSessionMock as any).mockResolvedValueOnce(undefined)

    const response = await POST(
      buildRequest({
        email: "user@example.com",
        password: "correct-password",
      }),
    )

    expect(response.status).toBe(200)
    expect(createSessionMock).toHaveBeenCalledWith("user-1")

    const json = await response.json()
    expect(json).toMatchObject({
      id: "user-1",
      email: "user@example.com",
      username: "user",
      role: "CONSUMER",
    })
  })
})
