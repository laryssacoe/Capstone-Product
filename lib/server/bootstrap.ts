import { prisma } from "./prisma"

const baseScenarios: Array<{
  id: string
  title: string
  summary: string
  issueTag: string
  difficulty: string
  estimatedMinutes: number
}> = []

const baseAchievements = [
  {
    code: "first_scenario",
    title: "Story Completed",
    description: "Finished your first full experience",
    points: 100,
    icon: "target",
    category: "milestone",
  },
  {
    code: "empathy_builder",
    title: "Perspective Seeker",
    description: "Completed stories across three different issue areas",
    points: 250,
    icon: "eye",
    category: "perspective",
  },
  {
    code: "difficult_choices",
    title: "Path Explorer",
    description: "Reached a different ending in the same story",
    points: 300,
    icon: "compass",
    category: "exploration",
  },
  {
    code: "reflection_complete",
    title: "Reflection in Practice",
    description: "Completed all required reflection prompts",
    points: 200,
    icon: "book-open",
    category: "reflection",
  },
  {
    code: "returning_listener",
    title: "Stayed Curious",
    description: "Returned on another day to complete a story",
    points: 180,
    icon: "repeat",
    category: "return",
  },
]

export async function ensureBaseContent() {
  if (baseScenarios.length > 0) {
    await Promise.all(
      baseScenarios.map((scenario) =>
        prisma.scenario.upsert({
          where: { id: scenario.id },
          update: {
            title: scenario.title,
            summary: scenario.summary,
            issueTag: scenario.issueTag,
            difficulty: scenario.difficulty,
            estimatedMinutes: scenario.estimatedMinutes,
          },
          create: scenario,
        }),
      ),
    )
  }

  await Promise.all(
    baseAchievements.map(({ category, ...achievement }) =>
      prisma.achievement.upsert({
        where: { code: achievement.code },
        update: {
          title: achievement.title,
          description: achievement.description,
          points: achievement.points,
          icon: achievement.icon,
          unlockHint: achievement.description,
          unlockLogic: {
            category,
          },
        },
        create: {
          ...achievement,
          unlockHint: achievement.description,
          unlockLogic: {
            category,
          },
        },
      }),
    ),
  )
}

export const achievementMap = baseAchievements.reduce<Record<string, typeof baseAchievements[number]>>(
  (acc, item) => {
    acc[item.code] = item
    return acc
  },
  {},
)
