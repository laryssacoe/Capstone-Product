import { NextRequest, NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"

const GUEST_SESSION_MAX_AGE_DAYS = 30

async function ensureGuestSession(sessionId: string) {
  if (!sessionId) return null

  const token = `anon-${sessionId}`
  const expiresAt = new Date(Date.now() + GUEST_SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)

  const created = await prisma.userSession.upsert({
    where: { id: sessionId },
    update: {
      token,
      expiresAt,
    },
    create: {
      id: sessionId,
      token,
      kind: "GUEST",
      expiresAt,
    },
  })

  return created.id
}

// POST /api/completions 
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      storySlug,
      storyVersion,
      sessionId,
      endingId,
      endingType,
      finalResources,
      finalHiddenState,
      totalChoices,
      totalTime,
      pathTaken,
      choicesMade,
      reflectionResponses,
    } = body ?? {}

    if (!storySlug || !sessionId || !endingId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const session = await getCurrentSession()
    const userId = session?.user?.id ?? session?.userId ?? null
    const resolvedSessionId = await ensureGuestSession(sessionId)

    const completion = await prisma.storyCompletion.create({
      data: {
        storySlug,
        storyVersion: storyVersion || "1.0.0",
        userId,
        sessionId: resolvedSessionId ?? sessionId,
        endingId,
        endingType: endingType || null,
        finalResources: finalResources || {},
        finalHiddenState: finalHiddenState || {},
        totalChoices: totalChoices || 0,
        totalTime: totalTime || 0,
        pathTaken: pathTaken || [],
        choicesMade: choicesMade || [],
        reflectionResponses: reflectionResponses || null,
      },
    })

    await updateStoryAnalytics(storySlug, endingId)

    return NextResponse.json({ completion, id: completion.id })
  } catch (error) {
    console.error("Error recording completion:", error)
    return NextResponse.json({ error: "Failed to record completion" }, { status: 500 })
  }
}

async function updateStoryAnalytics(storySlug: string, endingId: string) {
  try {
    let analytics = await prisma.storyAnalytics.findUnique({ where: { storySlug } })
    if (!analytics) {
      analytics = await prisma.storyAnalytics.create({
        data: {
          storySlug,
          totalStarts: 0,
          totalCompletions: 0,
          endingCounts: {},
        },
      })
    }

    const endingCounts = (analytics.endingCounts as Record<string, number>) || {}
    endingCounts[endingId] = (endingCounts[endingId] || 0) + 1

    await prisma.storyAnalytics.update({
      where: { storySlug },
      data: {
        totalCompletions: { increment: 1 },
        endingCounts,
      },
    })
  } catch (error) {
    console.error("Error updating analytics:", error)
  }
}