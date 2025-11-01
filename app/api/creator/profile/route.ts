import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"

const stringArray = z.array(z.string().trim().min(1).max(80)).max(16)

const creatorProfileSchema = z.object({
  penName: z.string().trim().min(2).max(120).optional(),
  headline: z.string().trim().min(4).max(160).optional(),
  expertiseTags: stringArray.optional(),
  focusAreas: stringArray.optional(),
  languages: stringArray.optional(),
  tagline: z.string().trim().max(160).optional(),
  biography: z.string().trim().min(40).max(4000).optional(),
  websiteUrl: z.string().trim().url().max(320).optional(),
  portfolioUrl: z.string().trim().url().max(320).optional().or(z.literal('').optional()),
  contactEmail: z.string().trim().email().max(160).optional(),
  socialLinks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        url: z.string().trim().url().max(320),
      }),
    )
    .max(12)
    .optional(),
  payoutDetails: z.record(z.unknown()).optional(),
  consentStatement: z.string().trim().max(400).optional(),
  acceptGuidelines: z.boolean().optional(),
  acceptTerms: z.boolean().optional(),
  acceptConsent: z.boolean().optional(),
  submitForReview: z.boolean().optional(),
})

function isProfileComplete(payload: z.infer<typeof creatorProfileSchema>): boolean {
  const biography = typeof payload.biography === "string" ? payload.biography.trim() : ""
  const focusAreas = Array.isArray(payload.focusAreas)
    ? payload.focusAreas.map((item) => item.trim()).filter(Boolean)
    : []
  const languages = Array.isArray(payload.languages)
    ? payload.languages.map((item) => item.trim()).filter(Boolean)
    : []

  const hasBasics = Boolean(payload.penName?.trim()) && Boolean(payload.headline?.trim()) && biography.length >= 80
  const hasLists = focusAreas.length > 0 && languages.length > 0
  const hasAcknowledgements = Boolean(payload.acceptGuidelines) && Boolean(payload.acceptTerms) && Boolean(payload.acceptConsent)

  return hasBasics && hasLists && hasAcknowledgements
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({
    profile,
  })
}

export async function PUT(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = creatorProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n") },
      { status: 400 },
    )
  }

  const data = parsed.data

  const existingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { creatorProfile: true },
  })

  if (!existingUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }

  const now = new Date()
  const complete = isProfileComplete(data)
  const previousProfile = existingUser.creatorProfile

  const guidelinesAcceptedAt =
    data.acceptGuidelines && !previousProfile?.guidelinesAcceptedAt ? now : previousProfile?.guidelinesAcceptedAt ?? null
  const termsAcceptedAt =
    data.acceptTerms && !previousProfile?.termsAcceptedAt ? now : previousProfile?.termsAcceptedAt ?? null
  const consentAcceptedAt =
    data.acceptConsent && !previousProfile?.consentAcceptedAt ? now : previousProfile?.consentAcceptedAt ?? null

  // If complete, set status to ACTIVE and completedAt
  const nextStatus = complete
    ? "ACTIVE"
    : previousProfile?.status && previousProfile.status !== "SUSPENDED"
      ? previousProfile.status
      : "DRAFT"

  const completedAt = complete
    ? previousProfile?.completedAt ?? now
    : previousProfile?.completedAt ?? null

  const normalized = {
  penName: data.penName ?? null,
  headline: data.headline ?? null,
  expertiseTags: data.expertiseTags ?? previousProfile?.expertiseTags ?? [],
  focusAreas: data.focusAreas ?? previousProfile?.focusAreas ?? [],
  languages: data.languages ?? previousProfile?.languages ?? [],
  tagline: data.tagline ?? null,
  biography: data.biography ?? null,
  websiteUrl: data.websiteUrl ?? null,
  portfolioUrl: data.portfolioUrl ?? null,
  contactEmail: data.contactEmail ?? null,
  socialLinks: data.socialLinks ?? previousProfile?.socialLinks ?? undefined,
  payoutDetails: typeof data.payoutDetails === 'undefined' ? undefined : JSON.stringify(data.payoutDetails),
  consentStatement: data.consentStatement ?? previousProfile?.consentStatement ?? null,
  guidelinesAcceptedAt,
  termsAcceptedAt,
  consentAcceptedAt,
  status: nextStatus as "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED",
  completedAt,
  }

  const profile = await prisma.creatorProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...normalized,
    },
    update: normalized,
  })

  if (complete && existingUser.role === "CONSUMER") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "CREATOR" },
    })
  }

  return NextResponse.json({
    profile,
    readyForSubmission: complete,
    status: profile.status,
  })
}
