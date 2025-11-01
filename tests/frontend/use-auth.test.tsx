import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"
import { useAuth } from "@/hooks/use-auth"

describe("useAuth hook", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns the authenticated user when the API succeeds", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: "user-1", email: "user@example.com", username: "user", role: "CONSUMER" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toMatchObject({ id: "user-1", email: "user@example.com" })
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", { cache: "no-store" })
  })

  it("falls back to null when the API responds with an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", {
        status: 401,
        statusText: "Unauthorized",
      }),
    )

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })
})
