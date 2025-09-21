import type { Scenario, SocialIssue } from "@/types/simulation"

export const socialIssues: Record<string, SocialIssue> = {
  housingDiscrimination: {
    id: "housing-discrimination",
    type: "racism",
    severity: "moderate",
    description: "Faces discrimination when searching for housing due to ethnicity.",
    impacts: ["Limited housing options", "Higher rent costs", "Unsafe neighborhoods"],
  },
  workplaceDisability: {
    id: "workplace-disability",
    type: "disability",
    severity: "moderate",
    description: "Needs reasonable accommodations while navigating interviews and teamwork.",
    impacts: ["Interview challenges", "Communication barriers", "Social isolation"],
  },
  corporateRacism: {
    id: "corporate-racism",
    type: "racism",
    severity: "moderate",
    description: "Subtle bias and microaggressions affect advancement in corporate settings.",
    impacts: ["Promotion barriers", "Workplace stress", "Imposter syndrome"],
  },
  economicHardship: {
    id: "economic-hardship",
    type: "poverty",
    severity: "severe",
    description: "Living paycheck to paycheck with limited financial safety net.",
    impacts: ["Food insecurity", "Limited healthcare", "Education barriers"],
  },
  mentalHealthStigma: {
    id: "mental-health-stigma",
    type: "mental-health",
    severity: "moderate",
    description: "Managing mental health while facing stigma and access issues.",
    impacts: ["Isolation", "Employment risk", "Care access barriers"],
  },
  ageDiscrimination: {
    id: "age-discrimination",
    type: "ageism",
    severity: "moderate",
    description: "Bias in hiring and social settings based on age.",
    impacts: ["Job search friction", "Social exclusion", "Care assumptions"],
  },
}

// Safe placeholder consequence (no TS errors)
const placeholderConsequence = (id: string, note = "Outcome placeholder."): {
  id: string
  type: "immediate" | "long-term"
  description: string
  resourceChanges: {
    money?: number
    time?: number
    energy?: number
    socialSupport?: number
    mentalHealth?: number
    physicalHealth?: number
  }
  emotionalImpact: {
    stress: number
    hope: number
    confidence: number
    isolation: number
  }
  socialImpact: {
    communitySupport: number
    familyRelations: number
    professionalNetwork: number
    publicPerception: number
  }
} => ({
  id,
  type: "immediate",
  description: note,
  resourceChanges: {
    money: 0,
    time: 0,
    energy: 0,
    socialSupport: 0,
    mentalHealth: 0,
    physicalHealth: 0,
  },
  emotionalImpact: {
    stress: 0,
    hope: 0,
    confidence: 0,
    isolation: 0,
  },
  socialImpact: {
    communitySupport: 0,
    familyRelations: 0,
    professionalNetwork: 0,
    publicPerception: 0,
  },
})

export const scenarioLibrary: Record<string, Scenario[]> = {
  "housing-discrimination": [
    {
      id: "housing-search",
      title: "Find Housing", // shorter
      description:
        "You need a new apartment, but repeated landlord bias blocks options. What’s your next move?",
      socialIssue: socialIssues.housingDiscrimination,
      context:
        "A few places fit your budget, yet in-person visits go quiet or listings vanish. Choose how to respond.",
      decisions: [
        {
          id: "legal-action",
          text: "File a complaint",
          description: "Document incidents and report to housing authorities.",
          resourceCosts: { time: 30, energy: 25, money: 15 },
          consequences: [placeholderConsequence("legal-action-placeholder")],
          // nextScenarioId optional; omitted to keep simple
        },
        {
          id: "accept-overpriced",
          text: "Take the costly unit",
          description: "Accept an overpriced apartment to secure housing now.",
          resourceCosts: { money: 40, mentalHealth: 15 },
          consequences: [placeholderConsequence("overpriced-placeholder")],
        },
        {
          id: "seek-help",
          text: "Ask community orgs",
          description: "Reach out to local advocacy groups for support and leads.",
          resourceCosts: { time: 20, energy: 15 },
          consequences: [placeholderConsequence("community-help-placeholder")],
        },
      ],
      minimumResources: {
        money: 10,
        time: 15,
        energy: 10,
        socialSupport: 0,
        mentalHealth: 0,
        physicalHealth: 0,
      },
      estimatedDuration: 10,
    },
  ],

  "workplace-disability": [
    {
      id: "job-interview",
      title: "Job Interview", 
      description:
        "Final interview is set. Decide how (or whether) to disclose your diagnosis and needs.",
      socialIssue: socialIssues.workplaceDisability,
      context:
        "The role fits. Past experiences are mixed. Your approach now may shape support later.",
      decisions: [
        {
          id: "disclose-upfront",
          text: "Disclose now",
          description: "Request accommodations during hiring.",
          resourceCosts: { energy: 25, mentalHealth: 15 },
          consequences: [placeholderConsequence("disclose-placeholder")],
        },
        {
          id: "wait-and-see",
          text: "Wait to disclose",
          description: "Address needs only if hired.",
          resourceCosts: { mentalHealth: 20, energy: 15 },
          consequences: [placeholderConsequence("wait-placeholder")],
        },
        {
          id: "partial-disclosure",
          text: "Share needs only",
          description: "Explain work style without naming diagnosis.",
          resourceCosts: { energy: 20, mentalHealth: 10 },
          consequences: [placeholderConsequence("partial-placeholder")],
        },
      ],
      minimumResources: {
        money: 0,
        time: 20,
        energy: 15,
        socialSupport: 20,
        mentalHealth: 25,
        physicalHealth: 0,
      },
      estimatedDuration: 8,
    },
  ],
}

export function getScenariosByIssue(issueType: string): Scenario[] {
  return scenarioLibrary[issueType] || []
}

export function getRandomScenarioForAvatar(avatarIssues: SocialIssue[]): Scenario | null {
  const availableScenarios: Scenario[] = []
  avatarIssues.forEach((issue) => {
    const scenarios = getScenariosByIssue(issue.id)
    availableScenarios.push(...scenarios)
  })
  if (availableScenarios.length === 0) return null
  const randomIndex = Math.floor(Math.random() * availableScenarios.length)
  return availableScenarios[randomIndex]
}

export function getNextScenario(_currentScenarioId: string, nextScenarioId: string): Scenario | null {
  for (const scenarios of Object.values(scenarioLibrary)) {
    const scenario = scenarios.find((s) => s.id === nextScenarioId)
    if (scenario) return scenario
  }
  return null
}

export function getAllScenarios(): Scenario[] {
  return Object.values(scenarioLibrary).flat()
}

export function getScenariosByDifficulty(difficulty: "easy" | "medium" | "hard"): Scenario[] {
  const allScenarios = getAllScenarios()
  return allScenarios.filter((scenario) => {
    const total = Object.values(scenario.minimumResources).reduce((sum, req) => sum + req, 0)
    switch (difficulty) {
      case "easy":
        return total < 100
      case "medium":
        return total >= 100 && total < 200
      case "hard":
        return total >= 200
      default:
        return true
    }
  })
}