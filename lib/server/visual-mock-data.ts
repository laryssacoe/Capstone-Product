function parseEnvFlag(value: string | undefined): boolean {
  if (!value) return false
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

export function isVisualMockApiEnabled(): boolean {
  return parseEnvFlag(process.env.VISUAL_MOCK_API)
}

const baseResources = {
  money: 40,
  time: 40,
  energy: 40,
  socialSupport: 40,
  mentalHealth: 40,
  physicalHealth: 40,
}

type MockAvatar = {
  id: string
  name: string
  age: number
  background: string
  appearance: Record<string, unknown>
  initialResources: typeof baseResources
  socialContext: Record<string, unknown>
  isPlayable: boolean
  storySlug: string
  storyTitle: string
  storySummary: string
  metrics?: {
    clicks: number
    starts: number
    score: number
    rank?: number | null
  }
}

const mockScenarios = [
  {
    id: "amber-thirty-days",
    slug: "amber-thirty-days",
    title: "Thirty Days",
    description: "A working parent tries to keep housing, childcare, and work stable after a rent increase.",
    socialIssue: {
      id: "amber-thirty-days-issue",
      type: "poverty",
      severity: "severe",
      description: "Housing instability forces tradeoffs between rent, transportation, and basic needs.",
      impacts: ["housing", "employment", "family stress"],
    },
    context: "You are balancing rent, shift work, and transportation while trying to avoid eviction.",
    decisions: [],
    minimumResources: { ...baseResources, money: 25, time: 20, energy: 18 },
    estimatedDuration: 12,
    metadata: {
      source: "visual-mock",
      storySlug: "amber-thirty-days",
      appearance: { image: "/scenes/kitchen-neutral.png" },
    },
  },
  {
    id: "katrina-guardian-week",
    slug: "katrina-guardian-week",
    title: "Days Without Mom",
    description: "A teen navigates school, siblings, and uncertainty while a parent faces immigration detention.",
    socialIssue: {
      id: "katrina-guardian-week-issue",
      type: "immigration",
      severity: "severe",
      description: "Family separation creates emotional strain and immediate caregiving responsibilities.",
      impacts: ["education", "mental health", "family stability"],
    },
    context: "You are managing school and caregiving while trying to keep the family together.",
    decisions: [],
    minimumResources: { ...baseResources, time: 24, energy: 22, socialSupport: 28 },
    estimatedDuration: 14,
    metadata: {
      source: "visual-mock",
      storySlug: "katrina-guardian-week",
      appearance: { image: "/scenes/katrina-profile.png" },
    },
  },
  {
    id: "dorothy-silence-between-calls",
    slug: "dorothy-silence-between-calls",
    title: "The Silence Between Calls",
    description: "An older adult experiences isolation and fragmented support after a major life change.",
    socialIssue: {
      id: "dorothy-silence-between-calls-issue",
      type: "mental-health",
      severity: "moderate",
      description: "Social isolation affects access to help, confidence, and day-to-day wellbeing.",
      impacts: ["community support", "health access"],
    },
    context: "You are trying to stay connected while navigating transportation and support gaps.",
    decisions: [],
    minimumResources: { ...baseResources, socialSupport: 20, energy: 24 },
    estimatedDuration: 10,
    metadata: {
      source: "visual-mock",
      storySlug: "dorothy-silence-between-calls",
      appearance: { image: "/scenes/neutral-image.png" },
    },
  },
  {
    id: "caleb-forty-miles",
    slug: "caleb-forty-miles",
    title: "Forty Miles Away",
    description: "A student weighs long commutes, family obligations, and school access in a rural area.",
    socialIssue: {
      id: "caleb-forty-miles-issue",
      type: "poverty",
      severity: "moderate",
      description: "Distance and transportation limits reduce access to education opportunities.",
      impacts: ["education", "time", "opportunity"],
    },
    context: "You are trying to stay in school while transportation and finances are constrained.",
    decisions: [],
    minimumResources: { ...baseResources, time: 26, money: 22 },
    estimatedDuration: 11,
    metadata: {
      source: "visual-mock",
      storySlug: "caleb-forty-miles",
      appearance: { image: "/scenes/school-corridor.png" },
    },
  },
]

const mockAvatars: MockAvatar[] = [
  {
    id: "amber-thirty-days",
    name: "Amber",
    age: 31,
    background: "Amber is trying to keep stable work while facing a sudden rent increase and limited backup support.",
    appearance: {
      skinTone: "medium",
      hairColor: "dark-brown",
      hairStyle: "curly",
      clothing: "work uniform",
      accessories: ["backpack"],
      image: "/scenes/kitchen-neutral.png",
    },
    initialResources: { ...baseResources, money: 28, time: 24, energy: 22, socialSupport: 25, mentalHealth: 34, physicalHealth: 42 },
    socialContext: {
      socioeconomicStatus: "low",
      location: "New York, NY",
      familyStructure: "Single parent household",
      educationLevel: "High school diploma",
      employmentStatus: "Hourly worker",
      healthConditions: [],
      socialIssues: [
        {
          id: "amber-issue",
          type: "poverty",
          severity: "severe",
          description: "Housing instability creates cascading decisions across work, childcare, and safety.",
          impacts: ["housing", "employment", "family stress"],
        },
      ],
    },
    isPlayable: true,
    storySlug: "amber-thirty-days",
    storyTitle: "Thirty Days",
    storySummary: "Navigate housing instability and impossible tradeoffs over the next month.",
    metrics: { clicks: 21, starts: 15, score: 51 },
  },
  {
    id: "katrina-guardian-week",
    name: "Katrina",
    age: 16,
    background: "Katrina is juggling school and caregiving while her family faces immigration-related uncertainty.",
    appearance: {
      skinTone: "tan",
      hairColor: "black",
      hairStyle: "straight",
      clothing: "school hoodie",
      accessories: ["notebook"],
      image: "/scenes/katrina-profile.png",
    },
    initialResources: { ...baseResources, money: 18, time: 27, energy: 26, socialSupport: 30, mentalHealth: 30, physicalHealth: 44 },
    socialContext: {
      socioeconomicStatus: "low",
      location: "San Antonio, TX",
      familyStructure: "Extended family household",
      educationLevel: "High school student",
      employmentStatus: "Student / part-time caregiver",
      healthConditions: [],
      socialIssues: [
        {
          id: "katrina-issue",
          type: "immigration",
          severity: "severe",
          description: "Immigration enforcement uncertainty impacts schooling, caregiving, and mental health.",
          impacts: ["family separation", "education", "stress"],
        },
      ],
    },
    isPlayable: true,
    storySlug: "katrina-guardian-week",
    storyTitle: "Days Without Mom",
    storySummary: "Carry family responsibilities while trying to stay in school.",
    metrics: { clicks: 18, starts: 12, score: 42 },
  },
  {
    id: "dorothy-silence-between-calls",
    name: "Dorothy",
    age: 74,
    background: "Dorothy is adapting to reduced mobility and fewer social connections after a major transition.",
    appearance: {
      skinTone: "light",
      hairColor: "gray",
      hairStyle: "short",
      clothing: "cardigan",
      accessories: ["glasses"],
      image: "/scenes/neutral-image.png",
    },
    initialResources: { ...baseResources, money: 36, time: 34, energy: 24, socialSupport: 19, mentalHealth: 26, physicalHealth: 28 },
    socialContext: {
      socioeconomicStatus: "middle",
      location: "Toronto, ON",
      familyStructure: "Lives alone",
      educationLevel: "College",
      employmentStatus: "Retired",
      healthConditions: ["Mobility limitations"],
      socialIssues: [
        {
          id: "dorothy-issue",
          type: "mental-health",
          severity: "moderate",
          description: "Isolation and access barriers make it harder to maintain wellbeing and support.",
          impacts: ["community support", "health access"],
        },
      ],
    },
    isPlayable: true,
    storySlug: "dorothy-silence-between-calls",
    storyTitle: "The Silence Between Calls",
    storySummary: "Navigate isolation, routines, and support systems after a life transition.",
    metrics: { clicks: 13, starts: 10, score: 33 },
  },
  {
    id: "caleb-forty-miles",
    name: "Caleb",
    age: 17,
    background: "Caleb faces long travel times and financial constraints while trying to stay on track academically.",
    appearance: {
      skinTone: "medium-dark",
      hairColor: "black",
      hairStyle: "short",
      clothing: "school jacket",
      accessories: ["bus pass"],
      image: "/scenes/school-corridor.png",
    },
    initialResources: { ...baseResources, money: 22, time: 21, energy: 24, socialSupport: 32, mentalHealth: 31, physicalHealth: 40 },
    socialContext: {
      socioeconomicStatus: "low",
      location: "Eastern Kentucky",
      familyStructure: "Two-generation household",
      educationLevel: "High school student",
      employmentStatus: "Student",
      healthConditions: [],
      socialIssues: [
        {
          id: "caleb-issue",
          type: "poverty",
          severity: "moderate",
          description: "Transportation and cost barriers reduce consistent access to education.",
          impacts: ["education", "time", "opportunity"],
        },
      ],
    },
    isPlayable: true,
    storySlug: "caleb-forty-miles",
    storyTitle: "Forty Miles Away",
    storySummary: "Balance school goals with transportation and family constraints.",
    metrics: { clicks: 11, starts: 8, score: 27 },
  },
]

export function getVisualMockScenarios() {
  return mockScenarios.map((scenario) => ({ ...scenario }))
}

export function getVisualMockAvatars(options: { featuredOnly?: boolean; take?: number | undefined }) {
  let items = [...mockAvatars]

  if (options.featuredOnly) {
    items.sort((a, b) => {
      const scoreDiff = (b.metrics?.score ?? 0) - (a.metrics?.score ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return a.name.localeCompare(b.name)
    })
  } else {
    items.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (typeof options.take === "number") {
    items = items.slice(0, options.take)
  }

  return items.map((avatar, index) => ({
    ...avatar,
    metrics: {
      ...(avatar.metrics ?? { clicks: 0, starts: 0, score: 0 }),
      rank: options.featuredOnly ? index + 1 : avatar.metrics?.rank ?? null,
    },
  }))
}
