// Core types for the social awareness simulation platform

export interface User {
  id: string
  name: string
  email: string
  progress: UserProgress[]
  createdAt: Date
}

export interface Avatar {
  id: string
  name: string
  age: number
  background: string
  appearance: AvatarAppearance
  initialResources: Resources
  socialContext: SocialContext
}

export interface AvatarAppearance {
  skinTone: string
  hairColor: string
  hairStyle: string
  clothing: string
  accessories: string[]
}

export interface SocialContext {
  socioeconomicStatus: "low" | "middle" | "high"
  location: string
  familyStructure: string
  educationLevel: string
  employmentStatus: string
  healthConditions: string[]
  socialIssues: SocialIssue[]
}

export interface SocialIssue {
  id: string
  type: "racism" | "disability" | "poverty" | "ageism" | "gender" | "lgbtq" | "mental-health"
  severity: "mild" | "moderate" | "severe"
  description: string
  impacts: string[]
}

export interface Resources {
  money: number
  time: number
  energy: number
  socialSupport: number
  mentalHealth: number
  physicalHealth: number
}

export interface Scenario {
  id: string
  title: string
  description: string
  socialIssue: SocialIssue
  context: string
  decisions: Decision[]
  minimumResources: Resources
  estimatedDuration: number
}

export interface Decision {
  id: string
  text: string
  description: string
  resourceCosts: Partial<Resources>
  consequences: Consequence[]
  nextScenarioId?: string
}

export interface Consequence {
  id: string
  type: "immediate" | "short-term" | "long-term"
  description: string
  resourceChanges: Partial<Resources>
  emotionalImpact: EmotionalImpact
  socialImpact: SocialImpact
}

export interface EmotionalImpact {
  stress: number
  hope: number
  confidence: number
  isolation: number
}

export interface SocialImpact {
  communitySupport: number
  familyRelations: number
  professionalNetwork: number
  publicPerception: number
}

export interface UserProgress {
  userId: string
  totalEmpathyScore: number
  scenariosCompleted: number
  totalScenarios: number
  issuesExplored: string[]
  achievements: Achievement[]
  learningMetrics: LearningMetrics
  streakDays: number
  lastActive: Date
  timeSpent: number // in minutes
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: Date
  category: "milestone" | "empathy" | "decision" | "exploration"
}

export interface LearningMetrics {
  empathyGrowth: number
  decisionQuality: number
  issueAwareness: number
  resourceManagement: number
  moralReasoning: number
}

export interface ScenarioProgress {
  scenarioId: string
  completedAt: Date
  decisionsMode: string[]
  finalResources: Resources
  lessonsLearned: string[]
  empathyScore: number
}

export interface SimulationState {
  currentAvatar: Avatar | null
  currentScenario: Scenario | null
  currentResources: Resources
  decisionHistory: Decision[]
  progressTracking: {
    scenariosCompleted: number
    totalEmpathyScore: number
    issuesExplored: SocialIssue[]
  }
}
