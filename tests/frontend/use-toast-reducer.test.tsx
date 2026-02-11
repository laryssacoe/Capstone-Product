import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { reducer, useToast } from "@/hooks/use-toast"

type ToastLike = {
  id: string
  title?: string
  open?: boolean
}

const toast = (id: string, title = id, open = true): ToastLike => ({
  id,
  title,
  open,
})

describe("useToast reducer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("keeps only the newest toast because of TOAST_LIMIT", () => {
    const state = { toasts: [toast("1")] }
    const next = reducer(state as any, {
      type: "ADD_TOAST",
      toast: toast("2"),
    })

    expect(next.toasts).toHaveLength(1)
    expect(next.toasts[0].id).toBe("2")
  })

  it("updates matching toasts and leaves non-matching toasts unchanged", () => {
    const state = { toasts: [toast("1", "first")] }
    const noMatch = reducer(state as any, {
      type: "UPDATE_TOAST",
      toast: { id: "2", title: "ignored" },
    })
    expect(noMatch.toasts[0].title).toBe("first")

    const updated = reducer(state as any, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "updated" },
    })
    expect(updated.toasts[0].title).toBe("updated")
  })

  it("dismisses a single toast or all toasts", () => {
    const state = { toasts: [toast("1"), toast("2")] }

    const dismissOne = reducer(state as any, {
      type: "DISMISS_TOAST",
      toastId: "1",
    })
    expect(dismissOne.toasts[0].open).toBe(false)
    expect(dismissOne.toasts[1].open).toBe(true)

    const dismissAll = reducer(state as any, {
      type: "DISMISS_TOAST",
    })
    expect(dismissAll.toasts.every((entry) => entry.open === false)).toBe(true)
  })

  it("removes a specific toast or all toasts", () => {
    const state = { toasts: [toast("1"), toast("2")] }

    const removeOne = reducer(state as any, {
      type: "REMOVE_TOAST",
      toastId: "1",
    })
    expect(removeOne.toasts).toHaveLength(1)
    expect(removeOne.toasts[0].id).toBe("2")

    const removeAll = reducer(state as any, {
      type: "REMOVE_TOAST",
    })
    expect(removeAll.toasts).toHaveLength(0)
  })
})

describe("useToast hook behavior", () => {
  it("dismisses when onOpenChange receives false and ignores true", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.dismiss()
    })

    act(() => {
      result.current.toast({ title: "first" })
    })

    expect(result.current.toasts[0]?.open).toBe(true)

    act(() => {
      result.current.toasts[0]?.onOpenChange?.(true)
    })
    expect(result.current.toasts[0]?.open).toBe(true)

    act(() => {
      result.current.toasts[0]?.onOpenChange?.(false)
    })
    expect(result.current.toasts[0]?.open).toBe(false)
  })
})
