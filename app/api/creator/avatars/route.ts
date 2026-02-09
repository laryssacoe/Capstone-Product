import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { v2 as cloudinary } from "cloudinary"


import { getCurrentSession } from "@/lib/server/auth"
import type { Prisma } from "@/src/generated/prisma/client"
import { prisma } from "@/lib/server/prisma"
export const dynamic = "force-dynamic"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})



const resourcesSchema = z.record(z.number().min(0).max(100))

const avatarSchema = z.object({
  id: z.string().optional(),
  storySlug: z.string().optional(),
  name: z.string().min(1),
  age: z.number().int().min(0).max(120).optional(),
  background: z.string().optional(),
  initialResources: resourcesSchema.default({}),
  socialContext: z.record(z.unknown()).optional(),
  appearance: z.record(z.unknown()).optional(),
  isPlayable: z.boolean().optional(),
})

const profileSchema = z.object({
  displayName: z.string().min(1).optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
})

function isCloudinaryUrl(value: string): boolean {
  return value.includes("cloudinary.com")
}

async function ensureCloudinaryAvatar(url: string): Promise<string> {
  if (isCloudinaryUrl(url)) return url
  const uploadResult = await cloudinary.uploader.upload(url, {
    folder: "loop/avatars",
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  })
  return uploadResult.secure_url
}

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [profile, stories, avatars] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.twineStory.findMany({
      where: { ownerId: session.user.id },
      select: { id: true, slug: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.avatarProfile.findMany({
      where: {
        story: { ownerId: session.user.id },
      },
      include: {
        story: { select: { slug: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return NextResponse.json({
    profile,
    stories,
    avatars: avatars.map((avatar) => ({
      id: avatar.id,
      name: avatar.name,
      age: avatar.age,
      background: avatar.background,
      initialResources: avatar.initialResources,
      appearance: avatar.appearance,
      socialContext: avatar.socialContext,
      isPlayable: avatar.isPlayable,
      story: avatar.story
        ? {
            slug: avatar.story.slug,
            title: avatar.story.title,
          }
        : null,
      updatedAt: avatar.updatedAt,
    })),
  })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Creator access required." }, { status: 403 })
  }

  const json = await request.json()
  const parsed = z
    .object({
      avatar: avatarSchema.optional(),
      profile: profileSchema.optional(),
    })
    .safeParse(json)

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n")
    return NextResponse.json({ error: message || "Invalid payload." }, { status: 400 })
  }

  const { avatar, profile } = parsed.data
  const results: Record<string, unknown> = {}

  if (profile) {
    let avatarUrl = profile.avatarUrl
    if (avatarUrl) {
      try {
        avatarUrl = await ensureCloudinaryAvatar(avatarUrl)
      } catch (error) {
        console.error("[creator/avatars] Failed to upload avatar to Cloudinary", error)
        return NextResponse.json({ error: "Unable to store profile image. Please try again." }, { status: 500 })
      }
    }
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      update: {
        displayName: profile.displayName ?? undefined,
        bio: profile.bio ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
      create: {
        userId: session.user.id,
        displayName: profile.displayName ?? session.user.username ?? session.user.email ?? "Creator",
        bio: profile.bio ?? null,
        avatarUrl: avatarUrl ?? null,
      },
    })
    results.profile = updatedProfile
  }

  if (avatar) {
    let storyId: string | null = null
    if (avatar.storySlug) {
      const story = await prisma.twineStory.findFirst({
        where: { slug: avatar.storySlug, ownerId: session.user.id },
        select: { id: true },
      })
      if (!story) {
        return NextResponse.json({ error: "Story not found or not owned by you." }, { status: 404 })
      }
      storyId = story.id
    }

    const avatarId = avatar.id ?? randomUUID()
    const appearance = avatar.appearance ? (avatar.appearance as Prisma.InputJsonValue) : undefined
    const socialContext = avatar.socialContext ? (avatar.socialContext as Prisma.InputJsonValue) : undefined
    const savedAvatar = await prisma.avatarProfile.upsert({
      where: { id: avatarId },
      update: {
        name: avatar.name,
        age: avatar.age ?? null,
        background: avatar.background ?? null,
        initialResources: avatar.initialResources as Prisma.InputJsonValue,
        appearance,
        socialContext,
        isPlayable: avatar.isPlayable ?? true,
        storyId,
      },
      create: {
        id: avatarId,
        name: avatar.name,
        age: avatar.age ?? null,
        background: avatar.background ?? null,
        initialResources: avatar.initialResources as Prisma.InputJsonValue,
        appearance,
        socialContext,
        isPlayable: avatar.isPlayable ?? true,
        storyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    results.avatar = savedAvatar
  }

  return NextResponse.json(results, { status: 200 })
}
