import { NextResponse } from "next/server"

import { prisma } from "@/lib/server/prisma"
export const dynamic = "force-dynamic"

type SocialIssueType =
  | "racism"
  | "disability"
  | "poverty"
  | "ageism"
  | "gender"
  | "lgbtq"
  | "mental-health"
  | "immigration"

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

function normalizeResources(raw: any) {
  return {
    money: typeof raw?.money === "number" ? raw.money : DEFAULT_RESOURCES.money,
    time: typeof raw?.time === "number" ? raw.time : DEFAULT_RESOURCES.time,
    energy: typeof raw?.energy === "number" ? raw.energy : DEFAULT_RESOURCES.energy,
    socialSupport: typeof raw?.socialSupport === "number" ? raw.socialSupport : DEFAULT_RESOURCES.socialSupport,
    mentalHealth: typeof raw?.mentalHealth === "number" ? raw.mentalHealth : DEFAULT_RESOURCES.mentalHealth,
    physicalHealth: typeof raw?.physicalHealth === "number" ? raw.physicalHealth : DEFAULT_RESOURCES.physicalHealth,
  }
}

function normalizeIssueType(raw: unknown, fallback: SocialIssueType): SocialIssueType {
  const input = typeof raw === "string" ? raw.toLowerCase() : ""
  const allowed: SocialIssueType[] = ["racism", "disability", "poverty", "ageism", "gender", "lgbtq", "mental-health", "immigration"]
  if (allowed.includes(input as SocialIssueType)) return input as SocialIssueType
  if (input.includes("disab")) return "disability"
  if (input.includes("mental")) return "mental-health"
  if (input.includes("lgbt")) return "lgbtq"
  if (input.includes("gender")) return "gender"
  if (input.includes("age")) return "ageism"
  if (input.includes("poverty") || input.includes("income") || input.includes("housing")) return "poverty"
  if (input.includes("immigra") || input.includes("deport")) return "immigration"
  return fallback
}

function normalizeSeverity(raw: unknown, fallback: "mild" | "moderate" | "severe" = "moderate") {
  const value = typeof raw === "string" ? raw.toLowerCase().trim() : ""
  if (["mild", "moderate", "severe"].includes(value)) {
    return value as "mild" | "moderate" | "severe"
  }
  if (value.includes("high") || value.includes("hard") || value.includes("advance")) return "severe"
  if (value.includes("low") || value.includes("easy") || value.includes("intro")) return "mild"
  return fallback
}

function parseBoolean(value: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(normalized)
}

function parseIntOrNull(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function serializeAvatar(avatar: any, rank?: number) {
  const clicks = avatar.experienceClicks ?? 0
  const starts = avatar.experienceStarts ?? 0
  const score = starts * 2 + clicks

  return {
    ...avatar,
    metrics: {
      clicks,
      starts,
      score,
      rank,
    },
  }
}

export async function GET(request: Request) {
  const syncScenariosIntoAvatars = async (take?: number | null) => {
    const scenarios = await prisma.scenario.findMany({
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take: take ?? undefined,
    })

    if (!scenarios.length) return

    // Only sync with PUBLIC + PLATFORM_OWNED stories
    const stories = await prisma.twineStory.findMany({
      where: {
        visibility: "PUBLIC",
        ownershipStatus: "PLATFORM_OWNED",
      },
      select: { id: true, slug: true, title: true },
    })

    const storyBySlug = new Map(stories.map((story) => [story.slug, story]))
    const storyById = new Map(stories.map((story) => [story.id, story]))

    await Promise.all(
      scenarios.map(async (scenario) => {
        const meta = asRecord(scenario.metadata)
        const issueMeta = asRecord(meta.issue)
        const storySlug = typeof meta.storySlug === "string" ? meta.storySlug : scenario.id
        const storyIdFromMeta = typeof meta.storyId === "string" ? meta.storyId : undefined
        const storyMatch = storyById.get(storyIdFromMeta ?? "") ?? storyBySlug.get(storySlug)

        const issueDescription =
          typeof issueMeta.description === "string" && issueMeta.description.trim().length > 0
            ? issueMeta.description
            : scenario.summary ?? scenario.title

        const socialIssue = {
          id:
            typeof issueMeta.id === "string" && issueMeta.id.trim().length > 0
              ? issueMeta.id
              : `${scenario.id}-issue`,
          type: normalizeIssueType(issueMeta.type ?? scenario.issueTag, "poverty"),
          severity: normalizeSeverity(issueMeta.severity ?? scenario.difficulty),
          description: issueDescription,
          impacts: Array.isArray(issueMeta.impacts)
            ? issueMeta.impacts.filter((value: unknown): value is string => typeof value === "string")
            : [],
        }

        const initialResources = normalizeResources(meta.minimumResources)

        const socialContext = {
          socioeconomicStatus: (meta.socialContext as any)?.socioeconomicStatus ?? "middle",
          location: (meta.socialContext as any)?.location ?? "Not specified",
          familyStructure: (meta.socialContext as any)?.familyStructure ?? "Not specified",
          educationLevel: (meta.socialContext as any)?.educationLevel ?? "Not specified",
          employmentStatus: (meta.socialContext as any)?.employmentStatus ?? "Not specified",
          healthConditions: Array.isArray((meta.socialContext as any)?.healthConditions)
            ? (meta.socialContext as any).healthConditions
            : [],
          socialIssues: Array.isArray((meta.socialContext as any)?.socialIssues)
            ? (meta.socialContext as any).socialIssues
            : [socialIssue],
        }

        await prisma.avatarProfile.upsert({
          where: { id: scenario.id },
          create: {
            id: scenario.id,
            name: scenario.title,
            age: typeof meta.age === "number" ? meta.age : 32,
            background: scenario.summary ?? issueDescription,
            appearance: meta.appearance ?? {},
            initialResources,
            socialContext,
            isPlayable: !!storyMatch,
            storyId: storyMatch?.id,
          },
          update: {
            name: scenario.title,
            background: scenario.summary ?? issueDescription,
            appearance: meta.appearance ?? {},
            initialResources,
            socialContext,
            isPlayable: storyMatch ? true : undefined,
            storyId: storyMatch?.id ?? undefined,
          },
        })
      }),
    )
  }

  const url = new URL(request.url)
  const featuredOnly = parseBoolean(url.searchParams.get("featured"))
  const limitParam = parseIntOrNull(url.searchParams.get("limit"))
  const take = featuredOnly ? limitParam ?? 3 : limitParam ?? undefined

  await syncScenariosIntoAvatars(take)

  const orderBy = featuredOnly
    ? [
        { experienceStarts: "desc" as const },
        { experienceClicks: "desc" as const },
        { updatedAt: "desc" as const },
      ]
    : [{ name: "asc" as const }]

  const avatars = await prisma.avatarProfile.findMany({
    where: {
      isPlayable: true,
      story: {
        visibility: "PUBLIC",
        ownershipStatus: "PLATFORM_OWNED",
      },
    },
    include: {
      story: {
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
        },
      },
    },
    orderBy,
    take,
  })

  // Add story info to each avatar for navigation
  const withMetrics = avatars.map((avatar, index) => {
    const serialized = serializeAvatar(avatar, featuredOnly ? index + 1 : undefined)
    return {
      ...serialized,
      storySlug: avatar.story?.slug ?? avatar.id,
      storyTitle: avatar.story?.title ?? null,
      storySummary: avatar.story?.summary ?? null,
    }
  })

  const response = NextResponse.json({
    avatars: withMetrics,
    meta: {
      total: avatars.length,
      featured: featuredOnly,
    },
  })
  response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300")
  return response
}
