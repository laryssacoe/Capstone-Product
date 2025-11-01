import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"

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

const { prisma } = await import("@/lib/server/prisma")
const { createSession } = await import("@/lib/server/auth")
const { POST } = await import("@/app/api/auth/register/route")

const prismaMock = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

const createSessionMock = createSession as unknown as Mock

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
})
