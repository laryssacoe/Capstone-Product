import { NextResponse } from "next/server"
import { z } from "zod"
import { v2 as cloudinary } from "cloudinary"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
export const dynamic = "force-dynamic"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_DATA_URI_LENGTH = 4 * 1024 * 1024 // ~4MB encoded
const dataUriPattern = /^data:image\/[a-zA-Z0-9+.-]+;base64,/i

const imageSchema = z.object({
  image: z
    .string()
    .min(1, "Image is required.")
    .refine((value) => isHttpUrl(value) || isDataUri(value), {
      message: "Image must be a valid https:// URL or base64 data URI.",
    }),
})

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

// Dummy moderation function simulating LLM parsing
async function moderateImage(imageUrl: string): Promise<{ acceptable: boolean; reason?: string }> {
  // Simulate LLM moderation (replace with real API call)
  if (imageUrl.includes("inappropriate")) {
    return { acceptable: false, reason: "Image flagged as inappropriate." }
  }
  return { acceptable: true }
}

async function persistAvatarToCloudinary(image: string) {
  const folder = "loop/avatars"
  return cloudinary.uploader.upload(image, {
    folder,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = imageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n") },
      { status: 400 },
    )
  }

  const { image } = parsed.data

  if (isDataUri(image) && image.length > MAX_DATA_URI_LENGTH) {
    return NextResponse.json({ error: "Image is too large. Please upload a smaller file." }, { status: 413 })
  }

  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const moderation = await moderateImage(image)

  if (!moderation.acceptable) {
    return NextResponse.json({ acceptable: false, reason: moderation.reason }, { status: 403 })
  }

  try {
    let avatarUrl = image
    const isCloudinaryUrl = isHttpUrl(image) && image.includes("cloudinary.com")
    if (!isCloudinaryUrl) {
      const uploadResult = await persistAvatarToCloudinary(image)
      avatarUrl = uploadResult.secure_url
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        avatarUrl,
      },
      update: {
        avatarUrl,
      },
    })

    return NextResponse.json({ acceptable: true, avatarUrl: profile.avatarUrl, persisted: true })
  } catch (error) {
    console.error("[image-moderation] Failed to persist moderated image", error)
    return NextResponse.json({ error: "Unable to save moderated image." }, { status: 500 })
  }
}
