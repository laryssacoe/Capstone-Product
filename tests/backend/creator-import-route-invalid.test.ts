import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn().mockResolvedValue({ user: { id: "u1", role: "CREATOR" } }),
}))

const { POST } = await import("@/app/api/creator/import/route")

describe("POST /api/creator/import (invalid payloads)", () => {
  it("returns 400 when file is missing", async () => {
    const formData = new FormData()
    const req = new Request("http://localhost/api/creator/import", { method: "POST", body: formData as any })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
