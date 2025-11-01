import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
import { applyStoryApprovalDecision, isStoryApprovalError } from "@/lib/server/story-approval"

const payloadSchema = z
  .object({
    slug: z.string().min(1).optional(),
    versionId: z.string().min(1).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((value) => Boolean(value.slug || value.versionId), {
    message: "Provide either a story code or versionId.",
    path: ["slug"],
  })

export async function PATCH(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 })
  }

  let parsed = payloadSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    const url = new URL(request.url)
    const fallbackSlug = url.searchParams.get("slug") ?? undefined
    if (fallbackSlug) {
      parsed = payloadSchema.safeParse({ slug: fallbackSlug })
    }
  }

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join("; ") || "Invalid payload."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { slug, versionId, notes } = parsed.data

  try {
    const version = versionId
      ? await prisma.storyVersion.findUnique({ where: { id: versionId }, include: { story: true } })
      : await prisma.storyVersion.findFirst({
          where: { story: { slug }, status: "PENDING" },
          include: { story: true },
          orderBy: { versionNumber: "desc" },
        })

    if (!version) {
      return NextResponse.json({ error: "Pending story version not found." }, { status: 404 })
    }

    if (version.status !== "PENDING") {
      return NextResponse.json({ error: `Version already ${version.status.toLowerCase()}.` }, { status: 409 })
    }

    const result = await applyStoryApprovalDecision({
      versionId: version.id,
      decision: "approve",
      reviewerId: session.user.id,
      notes: notes ?? null,
      version,
    })

    if (isStoryApprovalError(result)) {
      return NextResponse.json({ error: result.message }, { status: result.statusCode })
    }

    await prisma.twineStory.update({
      where: { id: result.storyId },
      data: { visibility: "PUBLIC" },
    })

    return NextResponse.json({
      ok: true,
      status: result.status,
      versionId: result.versionId,
      storyId: result.storyId,
      slug: result.storySlug,
      reviewedAt: result.reviewedAt,
    })
  } catch (error) {
    console.error("[api/admin/stories/approve] Failed to approve story", error)
    const message =
      error instanceof Error ? error.message || "Unable to approve story." : "Unable to approve story."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
