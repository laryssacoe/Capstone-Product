import { resolveRuntimeConfigFromSources } from "@/lib/server/story-runtime"

describe("resolveRuntimeConfigFromSources", () => {
  it("prefers scenario metadata over all other runtime sources", () => {
    const resolved = resolveRuntimeConfigFromSources({
      scenarioMetadata: {
        storyRuntime: {
          reflectionQuestions: [{ id: "scenario", prompt: "Scenario", options: ["A"] }],
        },
      },
      storyMetadata: {
        storyRuntime: {
          reflectionQuestions: [{ id: "story", prompt: "Story", options: ["B"] }],
        },
      },
      versionMetadata: {
        storyRuntime: {
          reflectionQuestions: [{ id: "version", prompt: "Version", options: ["C"] }],
        },
      },
      versionContent: {
        storyRuntime: {
          reflectionQuestions: [{ id: "content", prompt: "Content", options: ["D"] }],
        },
      },
    })

    expect(resolved?.reflectionQuestions[0]?.id).toBe("scenario")
  })

  it("resolves nested metadata.storyRuntime blocks", () => {
    const resolved = resolveRuntimeConfigFromSources({
      storyMetadata: {
        metadata: {
          storyRuntime: {
            reflectionQuestions: [{ id: "nested", prompt: "Nested", options: ["A"] }],
          },
        },
      },
    })

    expect(resolved?.reflectionQuestions[0]?.id).toBe("nested")
  })

  it("falls back to later candidates when earlier candidate is invalid", () => {
    const resolved = resolveRuntimeConfigFromSources({
      scenarioMetadata: { storyRuntime: { requiredReflectionIds: ["x"] } }, // not enough runtime data
      storyMetadata: {
        storyRuntime: {
          resourceLinks: [{ label: "Guide", href: "https://example.org" }],
        },
      },
    })

    expect(resolved?.resourceLinks).toEqual([{ label: "Guide", href: "https://example.org" }])
  })

  it("supports legacy simulation key", () => {
    const resolved = resolveRuntimeConfigFromSources({
      versionContent: {
        simulation: {
          postReflectionStats: [
            {
              icon: "heart",
              title: "Wellbeing",
              value: "High",
            },
          ],
        },
      },
    })

    expect(resolved?.postReflectionStats?.[0]).toMatchObject({
      icon: "heart",
      title: "Wellbeing",
      value: "High",
    })
  })

  it("returns null when no usable runtime is present", () => {
    expect(
      resolveRuntimeConfigFromSources({
        scenarioMetadata: { metadata: { test: true } },
        storyMetadata: { nope: true },
      }),
    ).toBeNull()
  })
})
