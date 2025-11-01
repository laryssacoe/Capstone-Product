import { NextResponse } from "next/server"

import { ensureBaseContent } from "@/lib/server/bootstrap"
import { prisma } from "@/lib/server/prisma"

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

const SOCIAL_ISSUE_TYPES = ["racism", "disability", "poverty", "ageism", "gender", "lgbtq", "mental-health"] as const
type SocialIssueType = (typeof SOCIAL_ISSUE_TYPES)[number]
const SOCIAL_ISSUE_SET = new Set<SocialIssueType>(SOCIAL_ISSUE_TYPES)

const SOCIAL_SEVERITIES = ["mild", "moderate", "severe"] as const
type SocialSeverity = (typeof SOCIAL_SEVERITIES)[number]

const DEFAULT_RESOURCES = {
  money: 40,
  time: 40,
  energy: 40,
  socialSupport: 40,
  mentalHealth: 40,
  physicalHealth: 40,
}

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
    const issueMeta = asRecord(metadata.issue)
    const resourcesSource = { ...DEFAULT_RESOURCES, ...asRecord(metadata.minimumResources) }
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
        source: "system",
        scenarioId: record.id,
        issueTag: record.issueTag,
      },
    }
  })
}

export async function GET() {
  try {
    await ensureBaseContent()

    const [avatars, systemScenarios, approvedStories] = await Promise.all([
      prisma.avatarProfile.findMany({
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
      prisma.twineStory.findMany({
        where: {
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

    const storyIdsNeedingVisibility = new Set<string>()
    const avatarIdsNeedingPlayable = new Set<string>()

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
      upsertScenario(`system:${scenario.id}`, scenario)
    }

    avatars
      .map((avatar) => {
        try {
          const story = avatar.story
          if (!story) {
            return null
          }

          const isApproved = Boolean(story.approvedAt) || story.ownershipStatus === "PLATFORM_OWNED"
          if (!isApproved) {
            return null
          }

          if (story.visibility !== "PUBLIC") {
            storyIdsNeedingVisibility.add(story.id)
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

          const nodeCount = storyNodes.length
          const estimatedDuration = Math.max(10, nodeCount * 3)
          const metadataIsPlayable = avatar.isPlayable || avatarIdsNeedingPlayable.has(avatar.id)

          const scenarioId = story.slug ?? avatar.id
          return {
            id: scenarioId,
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
      if (story.visibility !== "PUBLIC") {
        storyIdsNeedingVisibility.add(story.id)
      }

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
        minimumResources: normalizeResources(DEFAULT_RESOURCES),
        estimatedDuration: Math.max(10, nodes.length * 3),
        metadata: {
          source: "story",
          storyId: story.id,
          storySlug: story.slug,
          hasAvatarProfiles: story.avatars.length > 0,
        },
      }

      const scenarioKey = story.slug ? `story:${story.slug}` : `story:${story.id}`
      if (scenarioMap.has(scenarioKey)) {
        upsertScenario(scenarioKey, {
          metadata: scenarioPayload.metadata,
        })
      } else {
        upsertScenario(scenarioKey, scenarioPayload)
      }
    }

    if (storyIdsNeedingVisibility.size > 0) {
      await prisma.twineStory.updateMany({
        where: { id: { in: Array.from(storyIdsNeedingVisibility) } },
        data: { visibility: "PUBLIC" },
      })
    }

    if (avatarIdsNeedingPlayable.size > 0) {
      await prisma.avatarProfile.updateMany({
        where: { id: { in: Array.from(avatarIdsNeedingPlayable) } },
        data: { isPlayable: true },
      })
    }

  const scenarios = Array.from(scenarioMap.values()).sort((a, b) => a.title.localeCompare(b.title))

    return NextResponse.json({ scenarios })
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
