export function calculateStreak(dates: (Date | null | undefined)[]) {
  if (!dates.length) return 0
  const sorted = dates
    .filter(Boolean)
    .map((date) => (date ? new Date(date) : null))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())

  if (!sorted.length) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs(sorted[i - 1].getTime() - sorted[i].getTime())
    const diffDays = Math.round(diff / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      streak += 1
    } else {
      break
    }
  }
  return streak
}

export function buildLearningMetrics(completed: number, explored: number, achievements: number) {
  const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

  return {
    empathyGrowth: clamp(completed * 30 + explored * 10),
    decisionQuality: clamp(completed * 20 + achievements * 10),
    issueAwareness: clamp(explored * 30),
    resourceManagement: clamp(completed * 15 + explored * 5),
    moralReasoning: clamp(completed * 10 + achievements * 15),
  }
}
