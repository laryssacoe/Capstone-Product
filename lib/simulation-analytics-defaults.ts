export const simulationAnalyticsDefaults = {
  noStats: {
    title: "No additional stats for this story yet",
    subtitle: "This scenario does not include post-reflection statistics right now.",
    continueLabel: "Continue",
  },
  intro: {
    title: "The Reality Behind the Story",
    subtitle: "What you just experienced reflects the daily reality of millions. Let us show you the numbers.",
    ctaLabel: "See the Data",
  },
  comparison: {
    title: "How Your Experience Compares",
    benchmarks: {
      money: "Average: $85/week",
      health: "78% report high stress",
      support: "58% feel isolated",
    },
    insights: {
      supportHigh:
        "You prioritized building support networks. Research shows community connections are the strongest predictor of resilience.",
      moneyHigh:
        "You focused on financial stability. Studies show emotional support often has greater long-term impact than economic factors alone.",
      fallback:
        "Like many young caregivers, you faced impossible trade-offs. There are no perfect choices when systems fail to account for these realities.",
    },
    nextLabel: "How You Can Help",
  },
  action: {
    title: "How You Can Help",
    subtitle: "Understanding is the first step. Here are ways to make a real difference.",
    resourcesTitle: "Organizations Making a Difference",
    methodologyTitle: "Data & Methodology",
    cards: [
      {
        icon: "bookOpen",
        title: "Educate",
        body: "Share this experience with others. Awareness changes perspectives.",
        color: "#8b5cf6",
      },
      {
        icon: "users",
        title: "Support",
        body: "Volunteer with local organizations helping immigrant families.",
        color: "#60a5fa",
      },
      {
        icon: "scale",
        title: "Advocate",
        body: "Contact representatives about family-friendly immigration policies.",
        color: "#4ade80",
      },
    ],
  },
} as const

export type SimulationAnalyticsActionIcon = (typeof simulationAnalyticsDefaults.action.cards)[number]["icon"]
