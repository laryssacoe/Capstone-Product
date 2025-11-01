import { NextResponse } from "next/server"

import { ensureBaseContent } from "@/lib/server/bootstrap"
import { prisma } from "@/lib/server/prisma"

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
  await ensureBaseContent()

  const url = new URL(request.url)
  const featuredOnly = parseBoolean(url.searchParams.get("featured"))
  const limitParam = parseIntOrNull(url.searchParams.get("limit"))
  const take = featuredOnly ? limitParam ?? 3 : limitParam ?? undefined

  const orderBy = featuredOnly
    ? [
        { experienceStarts: "desc" as const },
        { experienceClicks: "desc" as const },
        { updatedAt: "desc" as const },
      ]
    : [{ name: "asc" as const }]

  const avatars = await prisma.avatarProfile.findMany({
    where: featuredOnly
      ? {
          isPlayable: true,
        }
      : undefined,
    orderBy,
    take,
  })

  const withMetrics = avatars.map((avatar, index) =>
    serializeAvatar(avatar, featuredOnly ? index + 1 : undefined),
  )

  return NextResponse.json({
    avatars: withMetrics,
    meta: {
      total: avatars.length,
      featured: featuredOnly,
    },
  })
}
