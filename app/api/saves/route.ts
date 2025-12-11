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

// GET /api/saves?story...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storySlug = searchParams.get("storySlug")
    const sessionId = searchParams.get("sessionId")

    if (!storySlug) {
      return NextResponse.json({ error: "storySlug is required" }, { status: 400 })
    }

    const session = await getCurrentSession()
    const userId = session?.user?.id ?? session?.userId

    const where: any = { storySlug }
    if (userId) {
      where.userId = userId
    } else if (sessionId) {
      where.sessionId = sessionId
      where.userId = null
    } else {
      return NextResponse.json({ error: "Either authentication or sessionId is required" }, { status: 400 })
    }

    const saves = await prisma.storySave.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 10,
    })

    return NextResponse.json({ saves })
  } catch (error) {
    console.error("Error fetching saves:", error)
    return NextResponse.json({ error: "Failed to fetch saves" }, { status: 500 })
  }
}

// POST /api/saves
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      storySlug,
      storyVersion,
      sessionId,
      saveName,
      isAutoSave,
      currentPassageId,
      resources,
      hiddenState,
      visitedPassages,
      choicesMade,
      pathTaken,
      completed,
      endingId,
    } = body ?? {}

    if (!storySlug || !sessionId || !currentPassageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const session = await getCurrentSession()
    const userId = session?.user?.id ?? session?.userId ?? null
    const resolvedSessionId = await ensureGuestSession(sessionId)

    const whereClause = {
      storySlug,
      ...(userId ? { userId } : { sessionId: resolvedSessionId ?? sessionId, userId: null }),
    }

    const existingSaves = await prisma.storySave.findMany({
      where: whereClause,
      orderBy: { updatedAt: "asc" },
    })

    const maxSaves = 3
    if (existingSaves.length >= maxSaves) {
      // Determine which save to delete
      let saveToDeleteId: string | null = null
      
      if (isAutoSave) {
        const oldestAuto = existingSaves.find((s) => s.isAutoSave)
        saveToDeleteId = oldestAuto?.id ?? existingSaves[0]?.id ?? null
      } else {
        saveToDeleteId = existingSaves[0]?.id ?? null
      }

      // Use deleteMany to avoid race condition errors
      if (saveToDeleteId) {
        await prisma.storySave.deleteMany({
          where: { id: saveToDeleteId }
        })
      }
    }

    const save = await prisma.storySave.create({
      data: {
        storySlug,
        storyVersion: storyVersion || "1.0.0",
        userId,
        sessionId: resolvedSessionId ?? sessionId,
        saveName: saveName || null,
        isAutoSave: !!isAutoSave,
        currentPassageId,
        resources: resources || {},
        hiddenState: hiddenState || {},
        visitedPassages: visitedPassages || [],
        choicesMade: choicesMade || [],
        pathTaken: pathTaken || [],
        completed: !!completed,
        endingId: endingId || null,
      },
    })

    return NextResponse.json({ save, id: save.id })
  } catch (error) {
    console.error("Error creating save:", error)
    return NextResponse.json({ error: "Failed to create save" }, { status: 500 })
  }
}

// DELETE /api/saves?story...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storySlug = searchParams.get("storySlug")
    const sessionId = searchParams.get("sessionId")

    if (!storySlug) {
      return NextResponse.json({ error: "storySlug is required" }, { status: 400 })
    }

    const session = await getCurrentSession()
    const userId = session?.user?.id ?? session?.userId

    const where: any = { storySlug }
    if (userId) {
      where.userId = userId
    } else if (sessionId) {
      where.sessionId = sessionId
      where.userId = null
    } else {
      return NextResponse.json({ error: "Either authentication or sessionId is required" }, { status: 400 })
    }

    // Delete all saves for this story/session combination
    const result = await prisma.storySave.deleteMany({
      where,
    })

    console.log(`Deleted ${result.count} saves for story ${storySlug}`)

    return NextResponse.json({ success: true, deletedCount: result.count })
  } catch (error) {
    console.error("Error deleting saves:", error)
    return NextResponse.json({ error: "Failed to delete saves" }, { status: 500 })
  }
}