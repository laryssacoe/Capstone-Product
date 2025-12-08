import { describe, expect, it } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useToast } from "@/hooks/use-toast"

describe("useToast", () => {
  it("allows adding a toast", () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast({ title: "Hello", description: "World" })
    })
    expect(result.current.toasts.length).toBeGreaterThan(0)
    expect(result.current.toasts[0].title).toBe("Hello")
  })
})
