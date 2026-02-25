import { NextResponse } from "next/server"


import { cachePolicy, setCacheControl } from "@/lib/http-cache"
import { prisma } from "@/lib/server/prisma"
import { getVisualMockScenarios, isVisualMockApiEnabled } from "@/lib/server/visual-mock-data"
export const dynamic = "force-dynamic"




function normalizeResources(raw: any) {
  return {
    money: typeof raw?.money === "number" ? raw.money : 0,
    time: typeof raw?.time === "number" ? raw.time : 0,
    energy: typeof raw?.energy === "number" ? raw.energy : 0,
    socialSupport: typeof raw?.socialSupport === "number" ? raw.socialSupport : 0,
    mentalHealth: typeof raw?.mentalHealth === "number" ? raw.mentalHealth : 0,
    physicalHealth: typeof raw?.physicalHealth === "number" ? raw.physicalHealth : 0,
  }
}

function toTitleCase(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\B\w/g, (c) => c.toLowerCase())
}

const SOCIAL_ISSUE_TYPES = ["racism", "disability", "poverty", "ageism", "gender", "lgbtq", "mental-health", "immigration"] as const
type SocialIssueType = (typeof SOCIAL_ISSUE_TYPES)[number]
const SOCIAL_ISSUE_SET = new Set<SocialIssueType>(SOCIAL_ISSUE_TYPES)

const SOCIAL_SEVERITIES = ["mild", "moderate", "severe"] as const
type SocialSeverity = (typeof SOCIAL_SEVERITIES)[number]

const defaultResources = {
  money: 40,
  time: 40,
  energy: 40,
  socialSupport: 40,
  mentalHealth: 40,
  physicalHealth: 40,
}

const words_per_minute = 170
const decision_seconds = 20
const min_duration_minutes = 5

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, any>
}

function normalizeIssueType(raw: unknown): SocialIssueType {
  const input = typeof raw === "string" ? raw.toLowerCase() : ""
  if (SOCIAL_ISSUE_SET.has(input as SocialIssueType)) {
    return input as SocialIssueType
  }
  if (input.includes("disab")) return "disability"
  if (input.includes("mental")) return "mental-health"
  if (input.includes("lgbt")) return "lgbtq"
  if (input.includes("gender")) return "gender"
  if (input.includes("age")) return "ageism"
  if (input.includes("poverty") || input.includes("income") || input.includes("housing")) return "poverty"
  if (input.includes("immigra") || input.includes("deport")) return "immigration"
  return "racism"
}

function normalizeSeverity(raw: unknown): SocialSeverity {
  const value = typeof raw === "string" ? raw.toLowerCase().trim() : ""
  if (SOCIAL_SEVERITIES.includes(value as SocialSeverity)) {
    return value as SocialSeverity
  }
  if (value.includes("high") || value.includes("hard") || value.includes("advance")) {
    return "severe"
  }
  if (value.includes("low") || value.includes("easy") || value.includes("beginner") || value.includes("intro")) {
    return "mild"
  }
  return "moderate"
}

function countWords(input: unknown): number {
  if (!input) return 0
  if (Array.isArray(input)) {
    return input.reduce((total, item) => total + countWords(item), 0)
  }
  if (typeof input !== "string") return 0
  const matches = input.trim().match(/\S+/g)
  return matches ? matches.length : 0
}

function estimateDurationFromNodes(nodes: Array<Record<string, any>>): number {
  let wordCount = 0
  let decisionCount = 0

  nodes.forEach((node) => {
    const content = asRecord(node.content)
    wordCount += countWords(content.text)
    const choices = Array.isArray(content.choices) ? content.choices : []
    if (node.type === "DECISION") {
      decisionCount += 1
    }
    choices.forEach((choice) => {
      wordCount += countWords(choice?.text ?? choice?.id)
    })
  })

  const readingMinutes = wordCount / words_per_minute
  const decisionMinutes = (decisionCount * decision_seconds) / 60
  const total = Math.ceil(readingMinutes + decisionMinutes)
  return Math.max(min_duration_minutes, total)
}

function buildSystemScenarios(records: Array<{
  id: string
  title: string
  summary: string | null
  issueTag: string | null
  difficulty: string | null
  estimatedMinutes: number | null
  metadata: unknown
}>) {
  return records.map((record) => {
    const metadata = asRecord(record.metadata)
    const metadataSource =
      typeof metadata.source === "string" && metadata.source.trim().length > 0
        ? metadata.source
        : "system"
    const metadataStorySlug =
      typeof metadata.storySlug === "string" && metadata.storySlug.trim().length > 0
        ? metadata.storySlug
        : record.id
    const issueMeta = asRecord(metadata.issue)
    const resourcesSource = { ...defaultResources, ...asRecord(metadata.minimumResources) }
    const minimumResources = normalizeResources(resourcesSource)
    const issueDescription =
      typeof issueMeta.description === "string" && issueMeta.description.trim().length > 0
        ? issueMeta.description
        : record.summary ?? record.title
    const issueImpacts = Array.isArray(issueMeta.impacts)
      ? issueMeta.impacts.filter((value): value is string => typeof value === "string")
      : []
    const context =
      typeof metadata.context === "string" && metadata.context.trim().length > 0
        ? metadata.context
        : issueDescription
    const estimatedDuration =
      typeof metadata.estimatedDuration === "number"
        ? metadata.estimatedDuration
        : record.estimatedMinutes ?? 15

    return {
      id: record.id,
      slug: metadataStorySlug,
      title: record.title,
      description: record.summary ?? issueDescription,
      socialIssue: {
        id: typeof issueMeta.id === "string" && issueMeta.id.trim().length > 0 ? issueMeta.id : `${record.id}-issue`,
        type: normalizeIssueType(issueMeta.type ?? record.issueTag),
        severity: normalizeSeverity(issueMeta.severity ?? record.difficulty),
        description: issueDescription,
        impacts: issueImpacts,
      },
      context,
      decisions: [],
      minimumResources,
      estimatedDuration,
      metadata: {
        ...metadata,
        source: metadataSource,
        scenarioId: record.id,
        issueTag: record.issueTag,
        storySlug: metadataStorySlug,
      },
    }
  })
}

export async function GET() {
  if (isVisualMockApiEnabled()) {
    const response = NextResponse.json({ scenarios: getVisualMockScenarios() })
    return setCacheControl(response, cachePolicy.collectionPublic)
  }

  try {
    // Only fetch avatars linked to PUBLIC stories that are approved or legacy PLATFORM_OWNED stories
    const [avatars, systemScenarios, approvedStories] = await Promise.all([
      prisma.avatarProfile.findMany({
        where: {
          story: {
            visibility: "PUBLIC",
            OR: [{ approvedAt: { not: null } }, { ownershipStatus: "PLATFORM_OWNED" }],
          },
        },
        include: {
          story: {
            include: {
              nodes: {
                orderBy: { createdAt: "asc" },
              },
              transitions: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.scenario.findMany({
        orderBy: [{ estimatedMinutes: "asc" }, { title: "asc" }],
      }),
      // Only fetch PUBLIC stories that are approved or legacy PLATFORM_OWNED stories
      prisma.twineStory.findMany({
        where: {
          visibility: "PUBLIC",
          OR: [{ approvedAt: { not: null } }, { ownershipStatus: "PLATFORM_OWNED" }],
        },
        include: {
          nodes: {
            orderBy: { createdAt: "asc" },
          },
          transitions: true,
          avatars: {
            select: { id: true, isPlayable: true },
          },
        },
      }),
    ])

    const avatarIdsNeedingPlayable = new Set<string>()
    const approvedStorySlugSet = new Set(approvedStories.map((story) => story.slug))
    const approvedStoryIdSet = new Set(approvedStories.map((story) => story.id))

    const scenarioMap = new Map<string, any>()
    const upsertScenario = (key: string, scenario: any) => {
      const existing = scenarioMap.get(key)
      if (existing) {
        scenarioMap.set(key, {
          ...existing,
          ...scenario,
          metadata: {
            ...(existing?.metadata ?? {}),
            ...(scenario?.metadata ?? {}),
          },
        })
      } else {
        scenarioMap.set(key, scenario)
      }
    }

    for (const scenario of buildSystemScenarios(systemScenarios)) {
      const scenarioMetadata = asRecord(scenario.metadata)
      const scenarioStorySlug =
        typeof scenarioMetadata.storySlug === "string" ? scenarioMetadata.storySlug : undefined
      const scenarioStoryId = typeof scenarioMetadata.storyId === "string" ? scenarioMetadata.storyId : undefined

      const isApprovedStoryScenario =
        (scenarioStorySlug && approvedStorySlugSet.has(scenarioStorySlug)) ||
        (scenarioStoryId && approvedStoryIdSet.has(scenarioStoryId))

      if ((scenarioStorySlug || scenarioStoryId) && !isApprovedStoryScenario) {
        continue
      }

      const key = `story:${scenario.slug ?? scenario.id}`
      if (!scenarioMap.has(key)) {
        upsertScenario(key, scenario)
      }
    }

    avatars
      .map((avatar) => {
        try {
          const story = avatar.story
          if (!story) {
            return null
          }

          if (
            story.visibility !== "PUBLIC" ||
            (!story.approvedAt && story.ownershipStatus !== "PLATFORM_OWNED")
          ) {
            return null
          }

          if (!avatar.isPlayable) {
            avatarIdsNeedingPlayable.add(avatar.id)
          }

          const storyNodes = Array.isArray(story.nodes) ? story.nodes : []
          const resources = normalizeResources(avatar.initialResources)
          const socialContext =
            avatar.socialContext && typeof avatar.socialContext === "object" && !Array.isArray(avatar.socialContext)
              ? avatar.socialContext
              : {}
          const appearance = asRecord(avatar.appearance)
          const avatarImage = typeof appearance.image === "string" ? appearance.image : ""

          const issues = Array.isArray((socialContext as any)?.socialIssues) ? (socialContext as any).socialIssues : []
          const primaryIssue = issues[0] ?? {
            id: `${avatar.id}-issue`,
            type: "racism",
            severity: "moderate",
            description: avatar.background ?? "",
            impacts: [],
          }

          const decisions = storyNodes
            .filter((node) => node && node.type === "DECISION")
            .map((node, index) => {
              const key = typeof node.key === "string" && node.key.trim().length > 0 ? node.key : `${avatar.id}-decision-${index}`
              return {
                id: key,
                text: node.title?.trim() ? node.title : toTitleCase(key),
                description: node.synopsis ?? "",
                resourceCosts: {},
                consequences: [],
                nextScenarioId: null,
              }
          })

          const estimatedDuration = estimateDurationFromNodes(storyNodes as Array<Record<string, any>>)
          const metadataIsPlayable = avatar.isPlayable || avatarIdsNeedingPlayable.has(avatar.id)

          const scenarioId = story.slug ?? avatar.id
          return {
            id: scenarioId,
            slug: scenarioId,
            title: story.title ?? `${avatar.name}'s Journey`,
            description: story.summary ?? avatar.background ?? "",
            socialIssue: {
              id: primaryIssue.id ?? `${avatar.id}-issue`,
              type: primaryIssue.type ?? "racism",
              severity: primaryIssue.severity ?? "moderate",
              description: primaryIssue.description ?? avatar.background ?? "",
              impacts: Array.isArray(primaryIssue.impacts) ? primaryIssue.impacts : [],
            },
            context: (socialContext as any)?.location ?? avatar.background ?? "",
            decisions,
            minimumResources: resources,
            estimatedDuration,
            metadata: {
              source: "avatar",
              storyId: story.id,
              storySlug: story.slug,
              avatarId: avatar.id,
              isPlayable: metadataIsPlayable,
              decisionCount: decisions.length,
              appearance,
              avatarImage,
            },
          }
        } catch (error) {
          console.warn("[api/scenarios] Skipping avatar due to transform error", {
            avatarId: avatar.id,
            error,
          })
          return null
        }
      })
      .filter((scenario): scenario is NonNullable<typeof scenario> => scenario !== null)
      .forEach((scenario) => {
        const scenarioKey = scenario.metadata?.storySlug
          ? `story:${scenario.metadata.storySlug}`
          : `avatar:${scenario.metadata?.avatarId ?? scenario.id}`
        upsertScenario(scenarioKey, scenario)
      })

    for (const story of approvedStories) {
      const nodes = Array.isArray(story.nodes) ? story.nodes : []
      const decisions = nodes
        .filter((node) => node && node.type === "DECISION")
        .map((node, index) => {
          const key = typeof node.key === "string" && node.key.trim().length > 0 ? node.key : `${story.slug ?? story.id}-decision-${index}`
          return {
            id: key,
            text: node.title?.trim() ? node.title : toTitleCase(key),
            description: node.synopsis ?? "",
            resourceCosts: {},
            consequences: [],
            nextScenarioId: null,
          }
        })

      const primaryTag = Array.isArray(story.tags) && story.tags.length > 0 ? story.tags[0] : "racism"
      const issueDescription = story.summary ?? story.title ?? toTitleCase(story.slug ?? story.id)

      const scenarioPayload = {
        id: story.slug ?? story.id,
        slug: story.slug ?? story.id,
        title: story.title ?? toTitleCase(story.slug ?? story.id),
        description: story.summary ?? issueDescription,
        socialIssue: {
          id: `${story.id}-issue`,
          type: normalizeIssueType(primaryTag),
          severity: "moderate" as const,
          description: issueDescription,
          impacts: [],
        },
        context: issueDescription,
        decisions,
        minimumResources: normalizeResources(defaultResources),
        estimatedDuration: estimateDurationFromNodes(nodes as Array<Record<string, any>>),
        metadata: {
          source: "story",
          storyId: story.id,
          storySlug: story.slug,
          hasAvatarProfiles: story.avatars.length > 0,
        },
      }

      const scenarioKey = story.slug ? `story:${story.slug}` : `story:${story.id}`
      if (!scenarioMap.has(scenarioKey)) {
        upsertScenario(scenarioKey, scenarioPayload)
      }
    }

    if (avatarIdsNeedingPlayable.size > 0) {
      await prisma.avatarProfile.updateMany({
        where: { id: { in: Array.from(avatarIdsNeedingPlayable) } },
        data: { isPlayable: true },
      })
    }

    const scenarios = Array.from(scenarioMap.values()).sort((a, b) => a.title.localeCompare(b.title))

    const response = NextResponse.json({ scenarios })
    return setCacheControl(response, cachePolicy.collectionPublic)
  } catch (error) {
    console.error("[api/scenarios] Failed to load scenarios", error)
    return NextResponse.json(
      {
        scenarios: [],
        error: "Unable to load scenarios right now. Please try again soon.",
      },
      { status: 503 },
    )
  }
}