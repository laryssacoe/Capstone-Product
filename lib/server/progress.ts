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

  // Fetch StoryCompletion records 
  let storyCompletions: Array<{ storySlug: string; createdAt: Date; totalTime: number | null }> = []
  try {
    const completions = await prisma.storyCompletion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        storySlug: true,
        createdAt: true,
        totalTime: true,
      },
    })
    storyCompletions = completions
  } catch (error) {
    console.warn("[getUserProgress] Could not fetch StoryCompletion records:", error)
    // Continue without StoryCompletion data if schema is not available
  }

  // Fetch StorySave records to find in-progress stories
  let userSaves: Array<{ storySlug: string; currentPassageId: string; updatedAt: Date }> = []
  try {
    const saves = await prisma.storySave.findMany({
      where: { userId },
      select: { storySlug: true, currentPassageId: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    userSaves = saves
  } catch (error) {
    console.warn("[getUserProgress] Could not fetch StorySave records:", error)
  }

  // Create a map of started stories (storySlug -> currentPassageId)
  const startedStories = new Map<string, string>()
  for (const save of userSaves) {
    if (!startedStories.has(save.storySlug)) {
      startedStories.set(save.storySlug, save.currentPassageId)
    }
  }

  // Get completed stories 
  const completedJourneys = journeys.filter((j) => j.status === "COMPLETED")
  const completedStorySlugs = new Set(storyCompletions.map((c) => c.storySlug))
  
  // Build a map of scenarios
  const scenarioById = new Map(scenarios.map((s) => [s.id, s]))
  const scenarioBySlug = new Map<string, typeof scenarios[0]>()
  for (const scenario of scenarios) {
    // Check if scenario has a storySlug in metadata
    const metadata = scenario.metadata as Record<string, unknown> | null
    const storySlug = metadata?.storySlug as string | undefined
    if (storySlug) {
      scenarioBySlug.set(storySlug, scenario)
    }
    // Try matching by scenario ID as slug
    scenarioBySlug.set(scenario.id, scenario)
  }

  // Check for completion sources: JourneyProgress or StoryCompletion
  const completedScenarioIds = new Set<string>()
  
  // Add scenarios from both sources
  for (const journey of completedJourneys) {
    completedScenarioIds.add(journey.scenarioId)
  }
  for (const storySlug of completedStorySlugs) {
    const matchedScenario = scenarioBySlug.get(storySlug)
    if (matchedScenario) {
      completedScenarioIds.add(matchedScenario.id)
    }
  }

  // Calculate metrics based on combined completions
  const completedCount = completedScenarioIds.size
  
  // Get issues explored from completed scenarios
  const issuesExplored: string[] = []
  for (const scenarioId of completedScenarioIds) {
    const scenario = scenarioById.get(scenarioId)
    if (scenario?.issueTag) {
      issuesExplored.push(scenario.issueTag)
    }
  }
  const uniqueIssues = Array.from(new Set(issuesExplored))

  const totalScenarios = scenarios.length || 1
  const completionPercentage = Math.round((completedCount / totalScenarios) * 100)
  
  // Calculate empathy score from completed scenarios
  let totalEmpathyScore = 0
  for (const scenarioId of completedScenarioIds) {
    const scenario = scenarioById.get(scenarioId)
    const minutes = scenario?.estimatedMinutes ?? 10
    totalEmpathyScore += minutes * 10
  }

  // Calculate streak from both sources
  const allCompletionDates: Date[] = [
    ...completedJourneys.map((j) => j.completedAt ?? j.startedAt),
    ...storyCompletions.map((c) => c.createdAt),
  ].filter((d): d is Date => d !== null)
  
  const streakDays = calculateStreak(allCompletionDates)
  
  // Calculate time spent
  let timeSpent = 0
  for (const scenarioId of completedScenarioIds) {
    const scenario = scenarioById.get(scenarioId)
    timeSpent += scenario?.estimatedMinutes ?? 10
  }
  // Add play time from StoryCompletion if available
  const totalPlayTime = storyCompletions.reduce((acc, c) => acc + (c.totalTime ?? 0), 0)
  if (totalPlayTime > 0) {
    timeSpent = Math.round(totalPlayTime / 60) 
  }

  const metrics = buildLearningMetrics(completedCount, uniqueIssues.length, achievements.length)
  
  // Build scenario states with completion status and in-progress status
  const scenarioStates = scenarios.map((scenario) => {
    const metadata = scenario.metadata as Record<string, unknown> | null
    const storySlug = (metadata?.storySlug as string) ?? scenario.id
    
    // Check if completed via JourneyProgress or StoryCompletion
    const isCompleted = completedScenarioIds.has(scenario.id) || completedStorySlugs.has(storySlug)
    
    // Check if story has been started (has a save) but not completed
    const hasStartedViaSlug = startedStories.has(storySlug)
    const hasStartedViaId = startedStories.has(scenario.id)
    const hasStarted = (hasStartedViaSlug || hasStartedViaId) && !isCompleted
    
    // Get current passage ID if in progress
    const currentPassageId = hasStarted 
      ? (startedStories.get(storySlug) || startedStories.get(scenario.id))
      : undefined
    
    return {
      id: scenario.id,
      title: scenario.title,
      issueTag: scenario.issueTag,
      difficulty: scenario.difficulty,
      estimatedMinutes: scenario.estimatedMinutes,
      completed: isCompleted,
      metadata: {
        ...(metadata ?? {}),
        storySlug,
        hasStarted,
        currentPassageId,
      },
    }
  })

  // Get most recent activity date
  const lastJourneyDate = journeys.length ? (journeys[0].completedAt ?? journeys[0].startedAt) : null
  const lastCompletionDate = storyCompletions.length ? storyCompletions[0].createdAt : null
  const lastSaveDate = userSaves.length ? userSaves[0].updatedAt : null
  
  let lastActive: Date | null = null
  const dates = [lastJourneyDate, lastCompletionDate, lastSaveDate].filter((d): d is Date => d !== null)
  if (dates.length > 0) {
    lastActive = dates.reduce((latest, date) => (date > latest ? date : latest))
  }

  return {
    userId,
    totalEmpathyScore,
    scenariosCompleted: completedCount,
    totalScenarios,
    completionPercentage,
    issuesExplored: uniqueIssues,
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
    lastActive,
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
  // Count completions from JourneyProgress
  const [journeyCompletedCount, achievements, journeys] = await Promise.all([
    prisma.journeyProgress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    prisma.journeyProgress.findMany({ where: { userId, status: "COMPLETED" }, include: { scenario: true } }),
  ])

  let storyCompletionCount = 0
  try {
    storyCompletionCount = await prisma.storyCompletion.count({ where: { userId } })
  } catch {
    // Ignore if StoryCompletion table does not exist
  }

  const completedCount = Math.max(journeyCompletedCount, storyCompletionCount)

  const unlockedCodes = new Set(achievements.map((entry) => entry.achievement.code))

  const pending: string[] = []
  if (!unlockedCodes.has("first_scenario") && completedCount >= 1) {
    pending.push("first_scenario")
  }
  if (!unlockedCodes.has("empathy_builder") && completedCount >= 3) {
    pending.push("empathy_builder")
  }
  if (!unlockedCodes.has("difficult_choices") && journeys.some((journey) => journey.scenario?.difficulty === "high")) {
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