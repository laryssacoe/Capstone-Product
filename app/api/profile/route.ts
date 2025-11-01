import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentSession } from "@/lib/server/auth"
import { Prisma } from "@/src/generated/prisma/client"
import { prisma } from "@/lib/server/prisma"

const MAX_AVATAR_DATA_URI_LENGTH = 4 * 1024 * 1024 // ~4MB encoded
const dataUriPattern = /^data:image\/[a-zA-Z0-9+.-]+;base64,/i

const avatarUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!value) return true
      if (isHttpUrl(value)) {
        return value.length <= 320
      }
      if (isDataUri(value)) {
        return value.length <= MAX_AVATAR_DATA_URI_LENGTH
      }
      return false
    },
    {
      message: "Profile image must be a valid https:// URL or base64 image under 4MB.",
    },
  )

const optionalTrimmedString = (schema: z.ZodString) =>
  z.preprocess((value) => normalizeOptionalString(value), schema.optional())

const profileSchema = z.object({
  displayName: optionalTrimmedString(z.string().trim().max(80)),
  avatarUrl: z.preprocess((value) => normalizeOptionalString(value), avatarUrlSchema.optional()),
  bio: optionalTrimmedString(z.string().trim().max(600)),
  timezone: optionalTrimmedString(z.string().trim().max(80)),
  pronouns: optionalTrimmedString(z.string().trim().max(40)),
  location: optionalTrimmedString(z.string().trim().max(160)),
  publicEmail: optionalTrimmedString(z.string().trim().email().max(160)),
  websiteUrl: optionalTrimmedString(z.string().trim().url().max(320)),
  linkedinUrl: optionalTrimmedString(z.string().trim().url().max(320)),
  twitterHandle: optionalTrimmedString(z.string().trim().max(60)),
  instagramHandle: optionalTrimmedString(z.string().trim().max(60)),
  tiktokHandle: optionalTrimmedString(z.string().trim().max(60)),
  expertiseTags: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  customLinks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        url: z.string().trim().url().max(320),
      }),
    )
    .max(12)
    .optional(),
  acceptConsent: z.boolean().optional(),
})

const fieldLabels: Record<string, string> = {
  displayName: "Display name",
  avatarUrl: "Profile image URL",
  bio: "Bio",
  timezone: "Timezone",
  pronouns: "Pronouns",
  location: "Location",
  publicEmail: "Public email",
  websiteUrl: "Website",
  linkedinUrl: "LinkedIn URL",
  twitterHandle: "X/Twitter handle",
  instagramHandle: "Instagram handle",
  tiktokHandle: "TikTok handle",
  expertiseTags: "Expertise tags",
  customLinks: "Custom links",
  "customLinks.label": "Custom link label",
  "customLinks.url": "Custom link URL",
  "customLinks.*.label": "Custom link label",
  "customLinks.*.url": "Custom link URL",
}

function friendlyErrorMessage(issue: z.ZodIssue): string {
  const path = issue.path.join(".")
  const normalizedPath = issue.path.map((segment) => (typeof segment === "number" ? "*" : String(segment))).join(".")
  const primaryKey = issue.path[0]?.toString() ?? ""
  const label =
    fieldLabels[path] ??
    fieldLabels[normalizedPath] ??
    fieldLabels[primaryKey] ??
    (path || "Field")

  switch (issue.code) {
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") {
        return `${label} needs to be a valid email address.`
      }
      if (issue.validation === "url") {
        return `${label} needs to include the full https:// address.`
      }
      return `${label} looks invalid. Please double-check the value.`
    case z.ZodIssueCode.invalid_type:
      return `${label} has an unexpected value. Please review and try again.`
    case z.ZodIssueCode.too_small:
      if (issue.type === "string" && typeof issue.minimum === "number") {
        return `${label} should be at least ${issue.minimum} characters.`
      }
      if (issue.type === "array" && typeof issue.minimum === "number") {
        return `${label} needs at least ${issue.minimum} item${issue.minimum === 1 ? "" : "s"}.`
      }
      return `${label} is too small.`
    case z.ZodIssueCode.too_big:
      if (issue.type === "string" && typeof issue.maximum === "number") {
        return `${label} should be ${issue.maximum} characters or fewer.`
      }
      if (issue.type === "array" && typeof issue.maximum === "number") {
        return `${label} supports up to ${issue.maximum} item${issue.maximum === 1 ? "" : "s"}.`
      }
      return `${label} is too long.`
    case z.ZodIssueCode.custom:
      return issue.message || `${label} has an issue. Please review.`
    default:
      return `${label}: ${issue.message}`
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function isDataUri(value: string): boolean {
  return dataUriPattern.test(value)
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  return trimmed
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({
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

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    const errorMessage = parsed.error.errors.map(friendlyErrorMessage).join("\n")
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const data = parsed.data

  const customLinks = data.customLinks
    ? (data.customLinks as Prisma.InputJsonValue)
    : Prisma.JsonNull

  const normalized = {
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
    bio: data.bio ?? null,
    timezone: data.timezone ?? null,
    pronouns: data.pronouns ?? null,
    location: data.location ?? null,
    publicEmail: data.publicEmail ?? null,
    websiteUrl: data.websiteUrl ?? null,
    linkedinUrl: data.linkedinUrl ?? null,
    twitterHandle: data.twitterHandle ?? null,
    instagramHandle: data.instagramHandle ?? null,
    tiktokHandle: data.tiktokHandle ?? null,
    expertiseTags: data.expertiseTags ?? [],
    customLinks,
  }

  const existing = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  })

  const consentAcceptedAt =
    data.acceptConsent && !existing?.consentAcceptedAt ? new Date() : existing?.consentAcceptedAt ?? null

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...normalized,
      consentAcceptedAt,
      preferences: (existing?.preferences ?? {}) as Prisma.InputJsonValue,
    },
    update: {
      ...normalized,
      consentAcceptedAt,
    },
  })

  return NextResponse.json({ profile })
}
