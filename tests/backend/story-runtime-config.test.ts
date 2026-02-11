import { resolveStoryRuntimeConfig } from "@/lib/story-runtime-config"

describe("resolveStoryRuntimeConfig", () => {
  it("returns null for empty input", () => {
    expect(resolveStoryRuntimeConfig(null)).toBeNull()
    expect(resolveStoryRuntimeConfig({})).toBeNull()
    expect(resolveStoryRuntimeConfig({ requiredReflectionIds: ["q1"] })).toBeNull()
  })

  it("normalizes questions and falls back required ids to question ids", () => {
    const runtime = resolveStoryRuntimeConfig({
      reflectionQuestions: [
        {
          id: " emotions ",
          prompt: " How did this feel? ",
          options: ["Anxious", "Overwhelmed", ""],
        },
        {
          id: "", // ignored
          prompt: "bad",
          options: ["x"],
        },
      ],
      methodologyText: "  Notes here  ",
    })

    expect(runtime).not.toBeNull()
    expect(runtime?.reflectionQuestions).toEqual([
      {
        id: "emotions",
        prompt: "How did this feel?",
        options: ["Anxious", "Overwhelmed"],
      },
    ])
    expect(runtime?.requiredReflectionIds).toEqual(["emotions"])
    expect(runtime?.methodologyText).toBe("Notes here")
  })

  it("uses explicit requiredReflectionIds when provided", () => {
    const runtime = resolveStoryRuntimeConfig({
      reflectionQuestions: [
        { id: "q1", prompt: "Q1", options: ["A"] },
        { id: "q2", prompt: "Q2", options: ["A"] },
      ],
      requiredReflectionIds: ["q2"],
    })

    expect(runtime?.requiredReflectionIds).toEqual(["q2"])
  })

  it("normalizes risk effects and preserves explicit empty effect objects", () => {
    const runtime = resolveStoryRuntimeConfig({
      riskEffects: {
        choose_help: { schoolRisk: -1, supportScore: 2, ignore: "x" },
        keep_open: {},
        bad: { schoolRisk: "oops" },
      },
      endingChoiceIds: ["finish"],
    })

    expect(runtime?.riskEffects).toEqual({
      choose_help: { schoolRisk: -1, workRisk: undefined, systemRisk: undefined, supportScore: 2, honestyScore: undefined },
      keep_open: { schoolRisk: undefined, workRisk: undefined, systemRisk: undefined, supportScore: undefined, honestyScore: undefined },
    })
  })

  it("normalizes background audio and clamps volume", () => {
    const runtime = resolveStoryRuntimeConfig({
      backgroundAudio: {
        path: " /audio/track.mp3 ",
        volume: 4,
      },
    })

    expect(runtime?.backgroundAudio).toEqual({
      path: "/audio/track.mp3",
      volume: 1,
    })
  })

  it("normalizes post reflection stats and applies safe defaults", () => {
    const runtime = resolveStoryRuntimeConfig({
      postReflectionStats: [
        {
          icon: "users",
          title: "Family Separation",
          value: 5.6,
          description: "",
          source: "",
        },
        {
          icon: "home",
          title: "Housing",
          value: "1 in 4",
          color: "",
        },
        {
          icon: "invalid",
          title: "Bad",
          value: "x",
        },
      ],
    })

    expect(runtime?.postReflectionStats).toEqual([
      {
        icon: "users",
        color: "#f87171",
        title: "Family Separation",
        value: "5.6",
        description: "Contextual metric for family separation.",
        source: "Story analytics dataset",
      },
      {
        icon: "home",
        color: "#60a5fa",
        title: "Housing",
        value: "1 in 4",
        description: "Contextual metric for housing.",
        source: "Story analytics dataset",
      },
    ])
  })

  it("filters malformed resource links and open reflection question", () => {
    const runtime = resolveStoryRuntimeConfig({
      resourceLinks: [
        { label: "A", href: "https://a.test" },
        { label: "", href: "https://b.test" },
      ],
      openReflectionQuestion: {
        id: "openResponse",
        prompt: "What changed for you?",
        placeholder: " Share here ",
      },
    })

    expect(runtime?.resourceLinks).toEqual([{ label: "A", href: "https://a.test" }])
    expect(runtime?.openReflectionQuestion).toEqual({
      id: "openResponse",
      prompt: "What changed for you?",
      placeholder: "Share here",
    })
  })

  it("normalizes methodology sources and note", () => {
    const runtime = resolveStoryRuntimeConfig({
      methodology: {
        sources: [
          { label: " Economic Data ", value: " MPI " },
          { label: "", value: "ignored" },
        ],
        note: "  Method note  ",
      },
    })

    expect(runtime?.methodology).toEqual({
      sources: [{ label: "Economic Data", value: "MPI" }],
      note: "Method note",
    })
  })

  it("uses methodologyText as methodology note fallback", () => {
    const runtime = resolveStoryRuntimeConfig({
      methodologyText: " Legacy methodology note ",
    })

    expect(runtime?.methodology).toEqual({
      sources: [],
      note: "Legacy methodology note",
    })
    expect(runtime?.methodologyText).toBe("Legacy methodology note")
  })
})
