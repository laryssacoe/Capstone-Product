import { NextResponse } from "next/server"

import type { Prisma } from "@prisma/client"

import { getOrCreateSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"

const VALID_KIND_VALUES = ["VIEW", "SELECT", "START"] as const
type InteractionKind = (typeof VALID_KIND_VALUES)[number]
const VALID_KINDS = new Set<InteractionKind>(VALID_KIND_VALUES)

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sanitizeMetadata(input: unknown) {
  if (!isObject(input)) return undefined
  try {
    return JSON.parse(JSON.stringify(input))
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  let payload: any

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const avatarId = typeof payload?.avatarId === "string" ? payload.avatarId.trim() : ""
  const storyIdRaw = typeof payload?.storyId === "string" ? payload.storyId.trim() : ""
  const storyId = storyIdRaw.length > 0 ? storyIdRaw : undefined
  const kind = typeof payload?.kind === "string" ? (payload.kind.toUpperCase() as InteractionKind) : undefined
  const metadata = sanitizeMetadata(payload?.metadata)

  if (!avatarId) {
    return NextResponse.json({ error: "avatarId is required" }, { status: 422 })
  }

  if (!kind || !VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: "Unsupported interaction kind" }, { status: 422 })
  }

  try {
    const session = await getOrCreateSession()

  const interaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const avatar = await tx.avatarProfile.findUnique({
        where: { id: avatarId },
        select: { id: true },
      })

      if (!avatar) {
        throw new Error("AvatarNotFound")
      }

      const updates: Record<string, { increment: number }> = {}
      if (kind === "SELECT") {
        updates.experienceClicks = { increment: 1 }
      }
      if (kind === "START") {
        updates.experienceStarts = { increment: 1 }
      }

      const recorded = await tx.storyInteraction.create({
        data: {
          avatarId,
          storyId,
          kind,
          metadata,
          sessionId: session.id,
          userId: session.userId ?? undefined,
        },
      })

      if (Object.keys(updates).length > 0) {
        await tx.avatarProfile.update({
          where: { id: avatarId },
          data: updates,
        })
      }

      return recorded
    })

    return NextResponse.json({
      ok: true,
      interactionId: interaction.id,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "AvatarNotFound") {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 })
    }
    console.error("[analytics/interactions] Failed to record interaction", {
      error,
      avatarId,
      kind,
    })
    return NextResponse.json({ error: "Unable to record interaction" }, { status: 500 })
  }
}
