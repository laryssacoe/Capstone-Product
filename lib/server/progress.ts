import { prisma } from "./prisma"
import { buildLearningMetrics, calculateStreak } from "./progress-utils"

type ScenarioDetailsPayload = {
  title?: string
  description?: string
  issue?: {
    id?: string
    type?: string
    severity?: string
    description?: string
    impacts?: string[]
  }
  difficulty?: string
  estimatedMinutes?: number
  minimumResources?: Record<string, number | undefined>
}

export async function getUserProgress(userId: string) {
  const [scenarios, journeys, achievements] = await Promise.all([
    prisma.scenario.findMany(),
    prisma.journeyProgress.findMany({
      where: { userId },
      include: { scenario: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    }),
  ])

  const completedJourneys = journeys.filter((j) => j.status === "COMPLETED")
  const issuesExplored = Array.from(new Set(completedJourneys.map((j) => j.scenario?.issueTag).filter(Boolean))) as string[]
  const totalScenarios = scenarios.length || 1
  const completionPercentage = Math.round((completedJourneys.length / totalScenarios) * 100)
  const totalEmpathyScore = completedJourneys.reduce((acc, journey) => {
    const minutes = journey.scenario?.estimatedMinutes ?? 10
    return acc + minutes * 10
  }, 0)

  const streakDays = calculateStreak(completedJourneys.map((j) => j.completedAt ?? j.startedAt))
  const timeSpent = completedJourneys.reduce(
    (acc, journey) => acc + (journey.scenario?.estimatedMinutes ?? 10),
    0,
  )

  const metrics = buildLearningMetrics(completedJourneys.length, issuesExplored.length, achievements.length)
  const scenarioStates = scenarios.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    issueTag: scenario.issueTag,
    difficulty: scenario.difficulty,
    estimatedMinutes: scenario.estimatedMinutes,
    completed: completedJourneys.some((journey) => journey.scenarioId === scenario.id),
     metadata: (scenario.metadata as Record<string, unknown> | null) ?? null,
  }))

  return {
    userId,
    totalEmpathyScore,
    scenariosCompleted: completedJourneys.length,
    totalScenarios,
    completionPercentage,
    issuesExplored,
    achievements: achievements.map((entry) => ({
      id: entry.achievement.id,
      title: entry.achievement.title,
      description: entry.achievement.description,
      icon: entry.achievement.icon ?? "target",
      unlockedAt: entry.unlockedAt,
      category: (entry.achievement.unlockLogic as { category?: string } | null)?.category ?? "milestone",
      points: entry.achievement.points,
    })),
    learningMetrics: metrics,
    streakDays,
    lastActive: journeys.length ? journeys[0].completedAt ?? journeys[0].startedAt : null,
    timeSpent,
    scenarios: scenarioStates,
  }
}

export async function completeScenario(userId: string, scenarioId: string, _details?: ScenarioDetailsPayload) {
  const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } })
  if (!scenario) {
    throw new Error("Scenario not found.")
  }

  const journey = await prisma.journeyProgress.upsert({
    where: {
      userId_scenarioId: {
        userId,
        scenarioId,
      },
    },
    update: {
      status: "COMPLETED",
      completedAt: new Date(),
      currentNode: "completed",
    },
    create: {
      userId,
      scenarioId,
      status: "COMPLETED",
      currentNode: "start",
      completedAt: new Date(),
    },
  })

  await evaluateAchievements(userId)

  return journey
}

async function evaluateAchievements(userId: string) {
  const [completedCount, achievements, scenarios] = await Promise.all([
    prisma.journeyProgress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    prisma.journeyProgress.findMany({ where: { userId, status: "COMPLETED" }, include: { scenario: true } }),
  ])

  const unlockedCodes = new Set(achievements.map((entry) => entry.achievement.code))

  const pending: string[] = []
  if (!unlockedCodes.has("first_scenario") && completedCount >= 1) {
    pending.push("first_scenario")
  }
  if (!unlockedCodes.has("empathy_builder") && completedCount >= 3) {
    pending.push("empathy_builder")
  }
  if (!unlockedCodes.has("difficult_choices") && scenarios.some((journey) => journey.scenario?.difficulty === "high")) {
    pending.push("difficult_choices")
  }

  if (!pending.length) return

  const achievementRecords = await prisma.achievement.findMany({
    where: { code: { in: pending } },
  })

  await prisma.userAchievement.createMany({
    data: achievementRecords.map((achievement) => ({
      achievementId: achievement.id,
      userId,
      unlockedAt: new Date(),
    })),
    skipDuplicates: true,
  })
}
