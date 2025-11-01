import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/server/auth"
import { ensureBaseContent } from "@/lib/server/bootstrap"
import { getUserProgress } from "@/lib/server/progress"

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureBaseContent()
  const progress = await getUserProgress(session.user.id)
  return NextResponse.json(progress)
}
