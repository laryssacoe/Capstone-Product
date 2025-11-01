import { buildLearningMetrics, calculateStreak } from "@/lib/server/progress-utils"

describe("calculateStreak", () => {
  it("counts consecutive completion days", () => {
    const today = new Date("2024-06-10")
    const yesterday = new Date("2024-06-09")
    const twoDaysAgo = new Date("2024-06-08")

    expect(calculateStreak([today, yesterday, twoDaysAgo])).toBe(3)
  })

  it("resets when a gap exists", () => {
    const today = new Date("2024-06-10")
    const gapDay = new Date("2024-06-05")
    const earlier = new Date("2024-06-04")

    expect(calculateStreak([today, gapDay, earlier])).toBe(1)
  })

  it("returns zero when there are no valid dates", () => {
    expect(calculateStreak([null, undefined])).toBe(0)
  })
})

describe("buildLearningMetrics", () => {
  it("raises metrics as the learner completes scenarios", () => {
    const metrics = buildLearningMetrics(3, 2, 1)
    expect(metrics.empathyGrowth).toBeGreaterThan(metrics.resourceManagement)
    expect(metrics.issueAwareness).toBeGreaterThan(20)
  })

  it("clamps extremely high values at 100", () => {
    const metrics = buildLearningMetrics(50, 50, 50)
    expect(metrics.empathyGrowth).toBe(100)
    expect(metrics.decisionQuality).toBe(100)
    expect(metrics.issueAwareness).toBe(100)
  })
})
