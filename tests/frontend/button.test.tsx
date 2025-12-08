import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

describe("Button component", () => {
  it("renders with default variant", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("renders as child element", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    )
    expect(screen.getByRole("link", { name: "Link" })).toHaveAttribute("href", "/test")
  })
})
