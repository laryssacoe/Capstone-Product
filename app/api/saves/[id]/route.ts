import { NextRequest, NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"

// GET /api/saves/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const save = await prisma.storySave.findUnique({ where: { id: params.id } })
    if (!save) {
      return NextResponse.json({ error: "Save not found" }, { status: 404 })
    }

    const session = await getCurrentSession()
    const userId = session?.user?.id ?? session?.userId
    const sessionId = request.headers.get("x-session-id")

    if (save.userId && save.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    if (!save.userId && sessionId && save.sessionId !== sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ save })
  } catch (error) {
    console.error("Error fetching save:", error)
    return NextResponse.json({ error: "Failed to fetch save" }, { status: 500 })
  }
}

// DELETE /api/saves/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const save = await prisma.storySave.findUnique({ where: { id: params.id } })
    if (!save) {
      return NextResponse.json({ error: "Save not found" }, { status: 404 })
    }

    const session = await getCurrentSession()
    const userId = session?.user?.id ?? session?.userId
    const sessionId = request.headers.get("x-session-id")

    if (save.userId && save.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    if (!save.userId && sessionId && save.sessionId !== sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await prisma.storySave.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting save:", error)
    return NextResponse.json({ error: "Failed to delete save" }, { status: 500 })
  }
}
