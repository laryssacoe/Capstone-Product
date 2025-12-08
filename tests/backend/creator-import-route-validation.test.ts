import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/auth", () => ({
  getCurrentSession: vi.fn().mockResolvedValue({ user: { id: "u1", role: "CREATOR" } }),
}))

const { POST } = await import("@/app/api/creator/import/route")

describe("POST /api/creator/import validation", () => {
  it("rejects invalid overrides payload", async () => {
    const file = new File(["{}"], "story.json", { type: "application/json" })
    const formData = new FormData()
    formData.append("twineFile", file)
    formData.append("overrides", "not-json")

    const req = new Request("http://localhost/api/creator/import", {
      method: "POST",
      body: formData as any,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
