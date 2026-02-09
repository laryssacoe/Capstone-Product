import { resolveStoryRuntimeConfig } from "@/lib/story-runtime-config"
import { prisma } from "@/lib/server/prisma"

type StoryRecord = {
  id: string
  slug: string
  title: string
  summary?: string | null
  tags?: string[] | null
}

type AvatarRuntimeInput = {
  initialResources?: Record<string, unknown>
  socialContext?: {
    socialIssues?: Array<{
      id?: string
      type?: string
      severity?: string
      description?: string
      impacts?: string[]
    }>
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function normalizeResources(raw: Record<string, unknown>) {
  return {
    money: typeof raw.money === "number" ? raw.money : 500,
    time: typeof raw.time === "number" ? raw.time : 100,
    health: typeof raw.health === "number" ? raw.health : 100,
    socialSupport: typeof raw.socialSupport === "number" ? raw.socialSupport : 50,
    mentalHealth: typeof raw.mentalHealth === "number" ? raw.mentalHealth : 70,
    physicalHealth: typeof raw.physicalHealth === "number" ? raw.physicalHealth : 80,
  }
}

export async function syncScenarioRuntimeForStory(params: {
  story: StoryRecord
  avatar?: AvatarRuntimeInput
  runtimeRaw?: unknown
  previousSlug?: string
}) {
  if (typeof prisma.scenario?.upsert !== "function") {
    return
  }

  const { story, avatar, runtimeRaw, previousSlug } = params

  if (
    previousSlug &&
    previousSlug !== story.slug &&
    typeof prisma.scenario?.deleteMany === "function"
  ) {
    await prisma.scenario.deleteMany({ where: { id: previousSlug } })
  }

  const existingScenario =
    typeof prisma.scenario?.findUnique === "function"
      ? await prisma.scenario.findUnique({
          where: { id: story.slug },
          select: { metadata: true, estimatedMinutes: true },
        })
      : null

  const existingMetadata = asRecord(existingScenario?.metadata)
  const initialResources = normalizeResources(asRecord(avatar?.initialResources))
  const socialIssues = Array.isArray(avatar?.socialContext?.socialIssues) ? avatar?.socialContext?.socialIssues : []
  const issue = socialIssues[0]

  const issueTag =
    (typeof issue?.type === "string" && issue.type.trim()) ||
    (Array.isArray(story.tags) && story.tags.length > 0 ? story.tags[0] : "general")
  const difficulty =
    (typeof issue?.severity === "string" && issue.severity.trim()) || "moderate"
  const issueDescription =
    (typeof issue?.description === "string" && issue.description.trim()) ||
    story.summary ||
    story.title

  const metadata: Record<string, unknown> = {
    ...existingMetadata,
    source: "story",
    storyId: story.id,
    storySlug: story.slug,
    minimumResources: initialResources,
    issue: {
      id: (typeof issue?.id === "string" && issue.id.trim()) || `${story.slug}-issue`,
      type: issueTag,
      severity: difficulty,
      description: issueDescription,
      impacts: Array.isArray(issue?.impacts) ? issue.impacts : [],
    },
  }

  if (runtimeRaw !== undefined) {
    const resolvedRuntime = resolveStoryRuntimeConfig(runtimeRaw)
    if (resolvedRuntime) {
      metadata.storyRuntime = resolvedRuntime
    } else {
      delete metadata.storyRuntime
    }
  } else if (existingMetadata.storyRuntime) {
    metadata.storyRuntime = existingMetadata.storyRuntime
  }

  await prisma.scenario.upsert({
    where: { id: story.slug },
    update: {
      title: story.title,
      summary: story.summary ?? story.title,
      issueTag,
      difficulty,
      metadata: metadata as any,
    },
    create: {
      id: story.slug,
      title: story.title,
      summary: story.summary ?? story.title,
      issueTag,
      difficulty,
      estimatedMinutes: existingScenario?.estimatedMinutes ?? null,
      metadata: metadata as any,
    },
  })
}
