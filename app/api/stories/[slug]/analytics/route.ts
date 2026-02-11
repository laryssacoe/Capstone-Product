import { NextResponse } from "next/server"

import { prisma } from "@/lib/server/prisma"
import { resolveRuntimeConfigFromSources } from "@/lib/server/story-runtime"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: {
    slug: string
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readNumberField(recordValue: unknown, key: string): number | null {
  const record = asRecord(recordValue)
  const value = record[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  return null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizeEndingCounts(value: unknown): Record<string, number> {
  const raw = asRecord(value)
  const normalized: Record<string, number> = {}
  for (const [endingId, count] of Object.entries(raw)) {
    if (!endingId) continue
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      normalized[endingId] = count
    }
  }
  return normalized
}

export async function GET(_request: Request, { params }: RouteParams) {
  const slug = params.slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: "Missing story slug" }, { status: 400 })
  }

  const story = await prisma.twineStory.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      latestVersion: {
        select: {
          metadata: true,
          content: true,
        },
      },
    },
  })

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 })
  }

  const [matchingScenario, storyAggregate, completions] = await Promise.all([
    typeof prisma.scenario?.findFirst === "function"
      ? prisma.scenario.findFirst({
          where: {
            OR: [
              { id: story.slug },
              { id: story.id },
              { metadata: { path: ["storySlug"], equals: story.slug } },
              { metadata: { path: ["storyId"], equals: story.id } },
            ],
          },
          select: { metadata: true },
        })
      : Promise.resolve(null),
    prisma.storyAnalytics.findUnique({
      where: { storySlug: story.slug },
      select: {
        totalStarts: true,
        totalCompletions: true,
        endingCounts: true,
      },
    }),
    prisma.storyCompletion.findMany({
      where: { storySlug: story.slug },
      select: {
        endingId: true,
        totalChoices: true,
        totalTime: true,
        finalResources: true,
        finalHiddenState: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ])

  const runtimeConfig = resolveRuntimeConfigFromSources({
    scenarioMetadata: matchingScenario?.metadata ?? null,
    versionMetadata: story.latestVersion?.metadata,
    versionContent: story.latestVersion?.content,
  })

  const moneySamples: number[] = []
  const healthSamples: number[] = []
  const supportSamples: number[] = []
  const timeSamples: number[] = []
  const choiceSamples: number[] = []

  const fallbackEndingCounts: Record<string, number> = {}
  for (const completion of completions) {
    fallbackEndingCounts[completion.endingId] = (fallbackEndingCounts[completion.endingId] ?? 0) + 1

    const money = readNumberField(completion.finalResources, "money")
    if (money !== null) moneySamples.push(money)

    const health = readNumberField(completion.finalResources, "health")
    if (health !== null) healthSamples.push(health)

    const supportFromHidden = readNumberField(completion.finalHiddenState, "supportScore")
    const supportFromResources = readNumberField(completion.finalResources, "support")
    const support = supportFromHidden ?? supportFromResources
    if (support !== null) supportSamples.push(support)

    if (typeof completion.totalTime === "number" && Number.isFinite(completion.totalTime)) {
      timeSamples.push(completion.totalTime)
    }

    if (typeof completion.totalChoices === "number" && Number.isFinite(completion.totalChoices)) {
      choiceSamples.push(completion.totalChoices)
    }
  }

  const endingCounts = (() => {
    const fromAggregate = normalizeEndingCounts(storyAggregate?.endingCounts)
    return Object.keys(fromAggregate).length > 0 ? fromAggregate : fallbackEndingCounts
  })()

  const topEndingId =
    Object.entries(endingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const totalStarts = storyAggregate?.totalStarts ?? 0
  const totalCompletions = storyAggregate?.totalCompletions ?? completions.length
  const completionRate = totalStarts > 0 ? totalCompletions / totalStarts : null

  return NextResponse.json({
    storySlug: story.slug,
    runtimeStats: runtimeConfig?.postReflectionStats ?? [],
    cohort: {
      samples: completions.length,
      totalStarts,
      totalCompletions,
      completionRate,
      topEndingId,
      endingCounts,
      averages: {
        money: average(moneySamples),
        health: average(healthSamples),
        support: average(supportSamples),
        totalTime: average(timeSamples),
        totalChoices: average(choiceSamples),
      },
    },
  })
}
