import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
import {
  applyStoryApprovalDecision,
  extractApprovalToken,
  isStoryApprovalError,
  type StoryApprovalDecision,
} from "@/lib/server/story-approval"

const payloadSchema = z.object({
  versionId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
  token: z.string().optional(),
})

type Payload = z.infer<typeof payloadSchema>

async function handleDecision(payload: Payload, mode: "json" | "html") {
  const session = await getCurrentSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const version = await prisma.storyVersion.findUnique({
    where: { id: payload.versionId },
    include: { story: true },
  })

  if (!version) {
    return mode === "json"
      ? NextResponse.json({ error: "Story version not found." }, { status: 404 })
      : htmlResponse("Story version not found.", 404)
  }

  const storedToken = extractApprovalToken(version.metadata)
  const tokenMatches = Boolean(payload.token && storedToken && payload.token === storedToken)

  if (!isAdmin && !tokenMatches) {
    return mode === "json"
      ? NextResponse.json({ error: "Unauthorized." }, { status: 403 })
      : htmlResponse("This approval link is no longer valid or you lack permission.", 403)
  }

  const decision = payload.decision as StoryApprovalDecision
  const result = await applyStoryApprovalDecision({
    versionId: payload.versionId,
    decision,
    reviewerId: isAdmin && session?.user ? session.user.id : null,
    notes: payload.notes ?? null,
    tokenUsed: tokenMatches,
    version,
  })

  if (isStoryApprovalError(result)) {
    return mode === "json"
      ? NextResponse.json({ error: result.message }, { status: result.statusCode })
      : htmlResponse(result.message, result.statusCode)
  }

  const verb = decision === "approve" ? "approved" : "rejected"
  const message = `Story “${result.storySlug}” version ${result.versionNumber} is now ${verb}.`

  if (mode === "json") {
    return NextResponse.json({
      ok: true,
      versionId: result.versionId,
      storyId: result.storyId,
      status: result.status,
      reviewedAt: result.reviewedAt,
      message,
    })
  }

  return htmlResponse(message, 200)
}

function htmlResponse(message: string, status: number) {
  const body = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Story Review</title>
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
        .panel { max-width: 36rem; background: rgba(15, 23, 42, 0.8); border-radius: 1.5rem; border: 1px solid rgba(148, 163, 184, 0.4); padding: 2.5rem; text-align: center; box-shadow: 0 30px 60px rgba(15, 118, 110, 0.25); }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        p { margin: 0; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="panel">
        <h1>Story Review Update</h1>
        <p>${message}</p>
      </div>
    </body>
  </html>`

  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n")
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return handleDecision(parsed.data, "json")
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const payload: Payload = {
    versionId: url.searchParams.get("versionId") ?? "",
    decision: (url.searchParams.get("decision") ?? "approve") as Payload["decision"],
    token: url.searchParams.get("token") ?? undefined,
    notes: url.searchParams.get("notes") ?? undefined,
  }

  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) {
    return htmlResponse("Approval link is invalid.", 400)
  }

  return handleDecision(parsed.data, "html")
}
