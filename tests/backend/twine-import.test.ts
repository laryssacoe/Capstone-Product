import { describe, expect, it } from "vitest"

import {
  convertTwisonToStoryPayload,
  repairTwisonStory,
  validateTwisonStory,
} from "@/lib/server/twine-transform"
import { twineHtmlToTwison } from "@/lib/server/twine-html"

describe("convertTwisonToStoryPayload", () => {
  it("converts a minimal Twison story into Loop graph payload", () => {
    const payload = convertTwisonToStoryPayload({
      name: "Sample Story",
      passages: [
        {
          pid: 1,
          name: "Start",
          text: "Welcome to the story.",
          links: [{ name: "Next", link: "Decision" }],
        },
        {
          pid: 2,
          name: "Decision",
          text: "Choose wisely.",
          links: [
            { name: "Outcome A", link: "A" },
            { name: "Outcome B", link: "B" },
          ],
        },
        { pid: 3, name: "A", text: "Path A outcome." },
        { pid: 4, name: "B", text: "Path B outcome." },
      ],
    })

    expect(payload.slug).toBe("sample-story")
    expect(payload.nodes).toHaveLength(4)
    expect(payload.paths.length).toBeGreaterThan(0)
    const decisionNode = payload.nodes.find((node) => node.title === "Decision")
    expect(decisionNode?.type).toBe("DECISION")
  })

  it("applies overrides on top of Twine metadata", () => {
    const payload = convertTwisonToStoryPayload(
      {
        name: "Original Title",
        passages: [{ pid: 1, name: "Start", text: "Opening." }],
      },
      {
        slug: "overridden",
        title: "Override Title",
        summary: "Custom summary",
        tags: ["one", "two"],
        visibility: "PUBLIC",
      },
    )

    expect(payload.slug).toBe("overridden")
    expect(payload.title).toBe("Override Title")
    expect(payload.summary).toBe("Custom summary")
    expect(payload.tags).toEqual(["one", "two"])
    expect(payload.visibility).toBe("PUBLIC")
  })
})

describe("twine helpers", () => {
  it("repairs incomplete Twison stories", () => {
    const repaired = repairTwisonStory({
      name: "",
      passages: [
        {
          name: "",
          text: "Open passage [[Continue->next]]",
          // links intentionally malformed
          links: null as unknown as undefined,
        },
        {
          // missing name
          text: "Next passage without links.",
        } as any,
      ],
    })

    expect(repaired.name).toBe("Untitled Twine Story")
    expect(repaired.passages?.[0].name).toBe("passage-1")
    expect(repaired.passages?.[0].links).toHaveLength(1)
    expect(validateTwisonStory(repaired).ok).toBe(true)
  })

  it("parses Twine HTML exports into Twison structure", () => {
    const html = `<!DOCTYPE html>
<html>
  <body>
    <tw-storydata name="Clinic Visit" startnode="1" creator="Twine" creator-version="2.3.9" ifid="ABC">
      <tw-passagedata pid="1" name="Start" tags="" position="100,100" size="200,200">You arrive at the clinic. [[Talk to nurse->Triage]]</tw-passagedata>
      <tw-passagedata pid="2" name="Triage" tags="decision" position="200,100" size="200,200">The nurse smiles. [[Ask about wait times->Desk]]</tw-passagedata>
      <tw-passagedata pid="3" name="Desk" tags="" position="300,100" size="200,200">The visit ends.</tw-passagedata>
    </tw-storydata>
  </body>
</html>`

    const story = twineHtmlToTwison(html)
    expect(story.name).toBe("Clinic Visit")
    expect(story.passages).toHaveLength(3)
    expect(story.passages?.[0].links).toEqual([
      { name: "Talk to nurse", link: "Triage", text: "Talk to nurse" },
    ])
    expect(validateTwisonStory(story).ok).toBe(true)
  })
})
