import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { resolve as resolveA, resolveMx } from "node:dns/promises"

import { prisma } from "@/lib/server/prisma"
import { createSession } from "@/lib/server/auth"

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please provide a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().trim().min(3).max(32),
})

const defaultTrustedDomains = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "pm.me",
]

const trustedDomains = (() => {
  const envValue = process.env.TRUSTED_EMAIL_DOMAINS
  if (!envValue) {
    return new Set(defaultTrustedDomains)
  }
  const domains = envValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return new Set(domains.length > 0 ? domains : defaultTrustedDomains)
})()

const domainCacheTtlMs = (() => {
  const raw = process.env.EMAIL_DOMAIN_CACHE_TTL_MS
  if (!raw) return 6 * 60 * 60 * 1000 // 6 hours
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 6 * 60 * 60 * 1000
})()

const maxDomainCacheEntries = (() => {
  const raw = process.env.EMAIL_DOMAIN_CACHE_MAX ?? "500"
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500
})()

type DomainCacheEntry = {
  checkedAt: number
  valid: boolean
}

const emailDomainCache = new Map<string, DomainCacheEntry>()

function pruneCacheIfNeeded() {
  if (emailDomainCache.size <= maxDomainCacheEntries) {
    return
  }
  const excess = emailDomainCache.size - maxDomainCacheEntries
  const entries = Array.from(emailDomainCache.entries())
  entries
    .sort((a, b) => a[1].checkedAt - b[1].checkedAt)
    .slice(0, excess)
    .forEach(([domain]) => emailDomainCache.delete(domain))
}

async function ensureDeliverableEmail(email: string) {
  const [, domain] = email.split("@")
  if (!domain) {
    throw new Error("Email domain is missing.")
  }

  if (trustedDomains.has(domain)) {
    return
  }

  const cached = emailDomainCache.get(domain)
  const now = Date.now()
  if (cached && now - cached.checkedAt <= domainCacheTtlMs) {
    if (cached.valid) {
      return
    }
    throw new Error("We couldn't verify this email domain. Please use a real email address.")
  }

  try {
    const records = await resolveMx(domain)
    if (records.length > 0) {
      emailDomainCache.set(domain, { checkedAt: now, valid: true })
      pruneCacheIfNeeded()
      return
    }
  } catch (error) {
    // swallow and attempt fallback resolution below
  }

  try {
    await resolveA(domain)
    emailDomainCache.set(domain, { checkedAt: now, valid: true })
    pruneCacheIfNeeded()
  } catch (error) {
    emailDomainCache.set(domain, { checkedAt: now, valid: false })
    pruneCacheIfNeeded()
    throw new Error("We couldn't verify this email domain. Please use a real email address.")
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors?.map((e) => e.message).join(", ") || "Invalid input."
    return NextResponse.json({ error: messages }, { status: 400 })
  }

  const { email, password, username } = parsed.data

  try {
    await ensureDeliverableEmail(email)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Please use a valid email address."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { email: true, username: true },
  })

  if (existing) {
    const conflicts: Array<"email" | "username"> = []
    if (existing.email === email) conflicts.push("email")
    if (existing.username === username) conflicts.push("username")

    const conflictMessage =
      conflicts.length === 1
        ? conflicts[0] === "email"
          ? "This email is already in use. Please try a different email or Sign in."
          : "This username is already taken."
        : "Email or username already in use."

    return NextResponse.json({ error: conflictMessage, fields: conflicts }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  let user
  try {
    user = await prisma.user.create({
      data: {
        email,
        username,
        hashedPassword,
        role: "CONSUMER",
        profile: {
          create: {
            displayName: username,
          },
        },
      },
    })
  } catch (error: any) {
    if (error?.code === "P2002") {
      const targets = Array.isArray(error?.meta?.target)
        ? (error.meta.target as string[])
        : typeof error?.meta?.target === "string"
          ? [error.meta.target]
          : []

      const normalizedTargets = targets.map((target) => target.toLowerCase())
      const fields = normalizedTargets.filter((value) => value === "email" || value === "username") as Array<
        "email" | "username"
      >

      const message =
        fields.length === 1
          ? fields[0] === "email"
            ? "This email is already in use. Please try a different email or Sign in."
            : "This username is already taken."
          : "Email or username already in use."

      return NextResponse.json({ error: message, fields }, { status: 409 })
    }
    throw error
  }

  await createSession(user.id)

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    { status: 201 },
  )
}
