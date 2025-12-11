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
    title: "First Steps",
    description: "Completed your first scenario",
    points: 100,
    icon: "target",
    category: "milestone",
  },
  {
    code: "empathy_builder",
    title: "Empathy Builder",
    description: "Completed three unique scenarios",
    points: 250,
    icon: "heart",
    category: "empathy",
  },
  {
    code: "difficult_choices",
    title: "Difficult Choices",
    description: "Completed a high-difficulty scenario",
    points: 300,
    icon: "brain",
    category: "decision",
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
