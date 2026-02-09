export type PostReflectionStatIconKey =
  | "users"
  | "graduationCap"
  | "dollarSign"
  | "home"
  | "heart"
  | "briefcase"

export type PostReflectionStat = {
  icon: PostReflectionStatIconKey
  color: string
  title: string
  value: string
  description: string
  source: string
}

type ReflectionRiskEffects = Partial<{
  schoolRisk: number
  workRisk: number
  systemRisk: number
  supportScore: number
  honestyScore: number
}>

export type ReflectionQuestionConfig = {
  id: string
  prompt: string
  options: string[]
}

export type ReflectionOpenQuestionConfig = {
  id: string
  prompt: string
  placeholder: string
}

export type StoryResourceLink = {
  label: string
  href: string
}

export type StoryRuntimeConfig = {
  backgroundAudio?: {
    path: string
    volume: number
  }
  requiredReflectionIds: string[]
  riskEffects: Record<string, ReflectionRiskEffects>
  endingChoiceIds: string[]
  reflectionQuestions: ReflectionQuestionConfig[]
  openReflectionQuestion?: ReflectionOpenQuestionConfig
  resourceLinks: StoryResourceLink[]
  methodologyText?: string
  postReflectionStats?: PostReflectionStat[]
}

const validStatIcons: ReadonlySet<PostReflectionStatIconKey> = new Set([
  "users",
  "graduationCap",
  "dollarSign",
  "home",
  "heart",
  "briefcase",
])

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function normalizeRiskEffects(value: unknown): Record<string, ReflectionRiskEffects> {
  const raw = asRecord(value)
  const normalized: Record<string, ReflectionRiskEffects> = {}
  for (const [choiceId, effectsValue] of Object.entries(raw)) {
    const effects = asRecord(effectsValue)
    const parsed: ReflectionRiskEffects = {
      schoolRisk: asNumber(effects.schoolRisk),
      workRisk: asNumber(effects.workRisk),
      systemRisk: asNumber(effects.systemRisk),
      supportScore: asNumber(effects.supportScore),
      honestyScore: asNumber(effects.honestyScore),
    }
    const hasAtLeastOne = Object.values(parsed).some((entry) => typeof entry === "number")
    if (hasAtLeastOne || Object.keys(effects).length === 0) {
      normalized[choiceId] = parsed
    }
  }
  return normalized
}

function normalizeReflectionQuestions(value: unknown): ReflectionQuestionConfig[] {
  if (!Array.isArray(value)) return []
  const questions: ReflectionQuestionConfig[] = []

  for (const entry of value) {
    const raw = asRecord(entry)
    const id = typeof raw.id === "string" ? raw.id.trim() : ""
    const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : ""
    const options = asStringList(raw.options)
    if (!id || !prompt || options.length === 0) continue
    questions.push({ id, prompt, options })
  }

  return questions
}

function normalizeOpenQuestion(value: unknown): ReflectionOpenQuestionConfig | undefined {
  const raw = asRecord(value)
  const id = typeof raw.id === "string" ? raw.id.trim() : ""
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : ""
  const placeholder = typeof raw.placeholder === "string" ? raw.placeholder.trim() : ""
  if (!id || !prompt) return undefined
  return { id, prompt, placeholder }
}

function normalizeResourceLinks(value: unknown): StoryResourceLink[] {
  if (!Array.isArray(value)) return []
  const links: StoryResourceLink[] = []
  for (const entry of value) {
    const raw = asRecord(entry)
    const label = typeof raw.label === "string" ? raw.label.trim() : ""
    const href = typeof raw.href === "string" ? raw.href.trim() : ""
    if (!label || !href) continue
    links.push({ label, href })
  }
  return links
}

function normalizePostReflectionStats(value: unknown): PostReflectionStat[] {
  if (!Array.isArray(value)) return []
  const stats: PostReflectionStat[] = []

  for (const entry of value) {
    const raw = asRecord(entry)
    const icon = raw.icon
    const color = typeof raw.color === "string" ? raw.color : ""
    const title = typeof raw.title === "string" ? raw.title : ""
    const statValue = typeof raw.value === "string" ? raw.value : ""
    const description = typeof raw.description === "string" ? raw.description : ""
    const source = typeof raw.source === "string" ? raw.source : ""

    if (
      typeof icon === "string" &&
      validStatIcons.has(icon as PostReflectionStatIconKey) &&
      color &&
      title &&
      statValue &&
      description &&
      source
    ) {
      stats.push({
        icon: icon as PostReflectionStatIconKey,
        color,
        title,
        value: statValue,
        description,
        source,
      })
    }
  }

  return stats
}

function normalizeBackgroundAudio(value: unknown): StoryRuntimeConfig["backgroundAudio"] {
  const raw = asRecord(value)
  const path = typeof raw.path === "string" ? raw.path.trim() : ""
  const volume = asNumber(raw.volume)
  if (!path) return undefined
  return {
    path,
    volume: typeof volume === "number" ? Math.min(1, Math.max(0, volume)) : 0.3,
  }
}

export function resolveStoryRuntimeConfig(rawValue: unknown): StoryRuntimeConfig | null {
  const root = asRecord(rawValue)
  if (Object.keys(root).length === 0) return null

  const reflectionQuestions = normalizeReflectionQuestions(root.reflectionQuestions)
  const requiredReflectionIds = asStringList(root.requiredReflectionIds)
  const riskEffects = normalizeRiskEffects(root.riskEffects)
  const endingChoiceIds = asStringList(root.endingChoiceIds)
  const resourceLinks = normalizeResourceLinks(root.resourceLinks)
  const postReflectionStats = normalizePostReflectionStats(root.postReflectionStats)
  const backgroundAudio = normalizeBackgroundAudio(root.backgroundAudio)
  const methodologyText =
    typeof root.methodologyText === "string" && root.methodologyText.trim().length > 0
      ? root.methodologyText.trim()
      : undefined
  const openReflectionQuestion = normalizeOpenQuestion(root.openReflectionQuestion)
  const finalRequiredReflectionIds =
    requiredReflectionIds.length > 0 ? requiredReflectionIds : reflectionQuestions.map((question) => question.id)

  const hasRuntimeData =
    Boolean(backgroundAudio) ||
    reflectionQuestions.length > 0 ||
    Boolean(openReflectionQuestion) ||
    Object.keys(riskEffects).length > 0 ||
    endingChoiceIds.length > 0 ||
    resourceLinks.length > 0 ||
    postReflectionStats.length > 0 ||
    Boolean(methodologyText)

  if (!hasRuntimeData) return null

  return {
    backgroundAudio,
    requiredReflectionIds: finalRequiredReflectionIds,
    riskEffects,
    endingChoiceIds,
    reflectionQuestions,
    openReflectionQuestion,
    resourceLinks,
    methodologyText,
    postReflectionStats,
  }
}
