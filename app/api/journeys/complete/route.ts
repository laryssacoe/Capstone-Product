import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentSession } from "@/lib/server/auth"
import { completeScenario, getUserProgress } from "@/lib/server/progress"
import { ensureBaseContent } from "@/lib/server/bootstrap"

const scenarioDetailsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  issue: z
    .object({
      id: z.string().optional(),
      type: z.string().optional(),
      severity: z.string().optional(),
      description: z.string().optional(),
      impacts: z.array(z.string()).optional(),
    })
    .optional(),
  difficulty: z.string().optional(),
  estimatedMinutes: z.number().int().optional(),
  minimumResources: z
    .object({
      money: z.number().optional(),
      time: z.number().optional(),
      energy: z.number().optional(),
      socialSupport: z.number().optional(),
      mentalHealth: z.number().optional(),
      physicalHealth: z.number().optional(),
    })
    .optional(),
}).optional()

const completeSchema = z.object({
  scenarioId: z.string().min(1),
  scenario: scenarioDetailsSchema,
})

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = completeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  await ensureBaseContent()
  try {
    await completeScenario(session.user.id, parsed.data.scenarioId, parsed.data.scenario ?? undefined)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }

  const progress = await getUserProgress(session.user.id)
  return NextResponse.json(progress)
}
