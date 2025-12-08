import { describe, expect, it } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useToast } from "@/hooks/use-toast"

describe("useToast advanced", () => {
  it("allows updating and dismissing toasts", () => {
    const { result } = renderHook(() => useToast())
    let id = ""
    act(() => {
      const t = result.current.toast({ title: "First" })
      id = t?.id ?? ""
    })
    expect(result.current.toasts.length).toBe(1)

    act(() => {
      result.current.toast({ id, title: "Updated" })
    })
    expect(result.current.toasts[0].title).toBe("Updated")

    act(() => {
      result.current.dismiss(id)
    })
    expect(result.current.toasts.find((t) => t.id === id)).toBeUndefined()
  })
})
