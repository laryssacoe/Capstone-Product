import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/prisma", () => {
  const scenario = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  }
  const journeyProgress = {
    findMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  }
  const userAchievement = {
    findMany: vi.fn(),
    createMany: vi.fn(),
  }
  const achievement = {
    findMany: vi.fn(),
  }

  return {
    prisma: {
      scenario,
      journeyProgress,
      userAchievement,
      achievement,
    },
  }
})

let prisma: typeof import("@/lib/server/prisma").prisma
let getUserProgress: typeof import("@/lib/server/progress").getUserProgress
let completeScenario: typeof import("@/lib/server/progress").completeScenario

type PrismaMock = {
  scenario: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  journeyProgress: {
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
  userAchievement: {
    findMany: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
  }
  achievement: {
    findMany: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

beforeAll(async () => {
  ;({ prisma } = await import("@/lib/server/prisma"))
  ;({ getUserProgress, completeScenario } = await import("@/lib/server/progress"))
  prismaMock = prisma as unknown as PrismaMock
})

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("getUserProgress", () => {
  it("aggregates journey data into a dashboard-friendly payload", async () => {
    prismaMock.scenario.findMany.mockResolvedValueOnce([
      { id: "scenario-1", title: "Scenario 1", issueTag: "equity", difficulty: "medium", estimatedMinutes: 12, metadata: null },
      { id: "scenario-2", title: "Scenario 2", issueTag: "allyship", difficulty: "high", estimatedMinutes: 18, metadata: null },
    ])
    const completion = {
      id: "journey-1",
      scenarioId: "scenario-1",
      status: "COMPLETED",
      completedAt: new Date("2024-01-01"),
      startedAt: new Date("2023-12-31"),
      scenario: { id: "scenario-1", estimatedMinutes: 12, issueTag: "equity", difficulty: "medium" },
    }
    prismaMock.journeyProgress.findMany.mockResolvedValueOnce([completion])
    prismaMock.userAchievement.findMany.mockResolvedValueOnce([
      {
        achievement: {
          id: "achv-1",
          code: "first_scenario",
          title: "First Steps",
          description: "Completed first scenario",
          icon: "target",
          unlockLogic: { category: "milestone" },
          points: 100,
        },
        unlockedAt: new Date("2024-01-02"),
      },
    ])

    const progress = await getUserProgress("user-1")

    expect(progress.userId).toBe("user-1")
    expect(progress.scenariosCompleted).toBe(1)
    expect(progress.totalScenarios).toBe(2)
    expect(progress.completionPercentage).toBe(50)
    expect(progress.issuesExplored).toEqual(["equity"])
    expect(progress.learningMetrics.empathyGrowth).toBeGreaterThan(0)
    expect(progress.scenarios).toHaveLength(2)
  })
})

describe("completeScenario", () => {
  it("creates missing scenarios, marks journeys completed, and awards achievements", async () => {
    prismaMock.scenario.findUnique.mockResolvedValueOnce(null)
    prismaMock.scenario.create.mockResolvedValueOnce({
      id: "scenario-rocket",
      title: "Scenario Rocket",
      issueTag: "innovation",
      difficulty: "high",
      estimatedMinutes: 15,
    })
    prismaMock.journeyProgress.upsert.mockResolvedValueOnce({
      id: "journey-1",
      scenarioId: "scenario-rocket",
      userId: "user-1",
      status: "COMPLETED",
    })
    prismaMock.journeyProgress.count.mockResolvedValueOnce(1)
    prismaMock.userAchievement.findMany.mockResolvedValueOnce([])
    prismaMock.journeyProgress.findMany.mockResolvedValueOnce([
      {
        id: "journey-1",
        status: "COMPLETED",
        scenario: { difficulty: "high" },
      },
    ])
    prismaMock.achievement.findMany.mockResolvedValueOnce([
      { id: "achv-first", code: "first_scenario" },
      { id: "achv-difficult", code: "difficult_choices" },
    ])
    prismaMock.userAchievement.createMany.mockResolvedValueOnce({ count: 2 })

    const result = await completeScenario("user-1", "scenario-rocket", {
      title: "Scenario Rocket",
      difficulty: "high",
      estimatedMinutes: 15,
    })

    expect(result).toMatchObject({
      scenarioId: "scenario-rocket",
      userId: "user-1",
      status: "COMPLETED",
    })
    expect(prismaMock.scenario.create).toHaveBeenCalled()
    expect(prismaMock.journeyProgress.upsert).toHaveBeenCalled()
    expect(prismaMock.userAchievement.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ achievementId: "achv-first" }),
          expect.objectContaining({ achievementId: "achv-difficult" }),
        ]),
        skipDuplicates: true,
      }),
    )
  })
})
