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
  isPlayable?: boolean
  storySlug?: string | null
  storyId?: string | null
  metrics?: {
    clicks: number
    starts: number
    score: number
    rank?: number | null
  }
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
  completionPercentage: number
  issuesExplored: string[]
  achievements: Achievement[]
  learningMetrics: LearningMetrics
  streakDays: number
  lastActive: Date | null
  timeSpent: number // in minutes
  scenarios: TrackedScenario[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: Date
  category: string
  points: number
}

export interface LearningMetrics {
  empathyGrowth: number
  decisionQuality: number
  issueAwareness: number
  resourceManagement: number
  moralReasoning: number
}

export interface TrackedScenario {
  id: string
  title: string
  issueTag: string | null
  difficulty: string | null
  estimatedMinutes: number | null
  completed: boolean
  metadata?: Record<string, unknown> | null
}

export interface StoryGraphNode {
  id: string
  key: string
  title?: string
  synopsis?: string
  type: "NARRATIVE" | "DECISION" | "RESOLUTION"
  content?: {
    duration?: string
    text?: string[]
    choices?: StoryGraphChoice[]
  }
  media?: {
    visual?: string
    audio?: string
  }
}

export interface StoryGraphChoice {
  id: string
  label: string
  leadsTo?: string
}

export interface StoryGraphPath {
  id: string
  key: string
  label: string
  summary?: string
  metadata?: Record<string, unknown>
}

export interface StoryGraphTransition {
  id: string
  fromNodeId: string
  toNodeId?: string
  pathId: string
  ordering?: number
  condition?: Record<string, unknown>
  effect?: Record<string, unknown>
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
