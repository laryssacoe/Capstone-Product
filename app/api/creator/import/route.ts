import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
import {
  convertTwisonToStoryPayload,
  type TwisonStory,
  repairTwisonStory,
  validateTwisonStory,
} from "@/lib/server/twine-transform"
import { upsertStoryGraph, type StoryPayload } from "@/lib/server/story-graph"
import { twineHtmlToTwison } from "@/lib/server/twine-html"

export const dynamic = "force-dynamic"

// Avatar metadata schema 
const avatarMetadataSchema = z.object({
  name: z.string().min(1),
  age: z.number().optional(),
  background: z.string().min(1),
  appearance: z.object({
    skinTone: z.string().optional(),
    hairColor: z.string().optional(),
    hairStyle: z.string().optional(),
    clothing: z.string().optional(),
    accessories: z.array(z.string()).optional(),
    image: z.string().optional(), // Profile image path should be in /scenes/ directory
  }).optional(),
  initialResources: z.object({
    money: z.number(),
    time: z.number(),
    socialSupport: z.number().optional().default(50),
    mentalHealth: z.number().optional().default(70),
    physicalHealth: z.number().optional().default(80),
  }),
  socialContext: z.object({
    socioeconomicStatus: z.string().optional(),
    location: z.string().optional(),
    familyStructure: z.string().optional(),
    educationLevel: z.string().optional(),
    employmentStatus: z.string().optional(),
    healthConditions: z.array(z.string()).optional(),
    socialIssues: z.array(z.object({
      id: z.string(),
      type: z.string(),
      severity: z.string(),
      description: z.string(),
      impacts: z.array(z.string()),
    })).optional(),
  }).optional(),
  isPlayable: z.boolean().optional().default(true),
})

type AvatarMetadata = z.infer<typeof avatarMetadataSchema>

const importOverridesSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/i, "Story code must be URL safe.").optional(),
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).optional(),
  avatar: avatarMetadataSchema.optional(),
})

type ImportOverrides = z.infer<typeof importOverridesSchema>

type ZipFileEntry = {
  name: string
  dir: boolean
  async: (type: "string") => Promise<string>
}

async function loadTwisonFromFile(file: File): Promise<TwisonStory> {
  const name = file.name?.toLowerCase() ?? ""

  const parseCandidate = (raw: string, sourceName: string) => {
    const trimmed = raw?.trim() ?? ""
    if (!trimmed) {
      throw new Error(`The file "${sourceName}" is empty.`)
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed)
      } catch (error) {
        throw new Error(`Unable to parse JSON from "${sourceName}": ${(error as Error).message}`)
      }
    }

    if (trimmed.includes("<tw-storydata")) {
      return twineHtmlToTwison(trimmed)
    }

    throw new Error(`Unsupported Twine export format in "${sourceName}". Upload Twison JSON or Twine HTML.`)
  }

  if (name.endsWith(".json") || name.endsWith(".html") || name.endsWith(".htm")) {
    const raw = await file.text()
    return parseCandidate(raw, file.name ?? "twine-file")
  }

  if (!name.endsWith(".zip")) {
    throw new Error("Unsupported file type. Upload a Twine .zip, .json, or .html export.")
  }

  let JSZip: any
  try {
    JSZip = await import("jszip").then((mod) => mod.default ?? mod)
  } catch {
    throw new Error(
      "Zip imports require the 'jszip' package. Please install it with `npm install jszip` and try again.",
    )
  }

  const zip = await new JSZip().loadAsync(await file.arrayBuffer())
  const files = zip.files as Record<string, ZipFileEntry>
  const entries = Object.values(files).filter(
    (entry) =>
      !entry.dir &&
      (entry.name.toLowerCase().endsWith(".json") ||
        entry.name.toLowerCase().endsWith(".html") ||
        entry.name.toLowerCase().endsWith(".htm")),
  )

  if (!entries.length) {
    throw new Error("The uploaded zip does not contain a Twison JSON or Twine HTML export.")
  }

  let lastError: Error | null = null
  for (const entry of entries) {
    try {
      const raw = await entry.async("string")
      return parseCandidate(raw, entry.name)
    } catch (error) {
      lastError = error as Error
    }
  }

  throw new Error(
    lastError?.message ??
      "Unable to read Twine export from the uploaded archive. Ensure it contains a Twison JSON or Twine HTML file.",
  )
}

// Create or update avatar profile from metadata
async function upsertAvatarFromMetadata(
  ownerId: string,
  storyId: string,
  avatarMetadata: AvatarMetadata,
  storyTitle: string,
) {
  // Check if avatar already exists for this story
  const existingAvatar = await prisma.avatarProfile.findFirst({
    where: { storyId },
  })

  const avatarData = {
    name: avatarMetadata.name,
    background: avatarMetadata.background,
    initialResources: {
      money: avatarMetadata.initialResources.money,
      time: avatarMetadata.initialResources.time,
      socialSupport: avatarMetadata.initialResources.socialSupport ?? 50,
      mentalHealth: avatarMetadata.initialResources.mentalHealth ?? 70,
      physicalHealth: avatarMetadata.initialResources.physicalHealth ?? 80,
    },
    appearance: avatarMetadata.appearance ?? {},
    socialContext: avatarMetadata.socialContext ?? {},
    isPlayable: avatarMetadata.isPlayable ?? true,
    updatedAt: new Date(),
  }

  if (existingAvatar) {
    // Update existing avatar
    await prisma.avatarProfile.update({
      where: { id: existingAvatar.id },
      data: avatarData,
    })
    return existingAvatar.id
  } else {
    // Create new avatar
    const newAvatar = await prisma.avatarProfile.create({
      data: {
        id: randomUUID(),
        storyId,
        ...avatarData,
        createdAt: new Date(),
      },
    })
    return newAvatar.id
  }
}

// Auto-generate basic avatar from story content if no metadata provided
async function maybeAttachAutoAvatar(
  ownerId: string,
  storyId: string,
  payload: StoryPayload,
  twison: TwisonStory,
) {
  const firstNode = payload.nodes[0]
  if (!firstNode) return

  const hasAvatar = await prisma.avatarProfile.findFirst({
    where: { storyId },
  })
  if (hasAvatar) return

  // Extract background from first node's text content
  const content = firstNode.content as any
  const textArray = content?.text
  const background = Array.isArray(textArray) 
    ? textArray.join(" ").slice(0, 240) 
    : typeof textArray === "string" 
      ? textArray.slice(0, 240) 
      : ""
  
  if (!background) return

  await prisma.avatarProfile.create({
    data: {
      id: randomUUID(),
      storyId,
      name: firstNode.title ?? twison.name ?? "Story Protagonist",
      background,
      initialResources: {
        money: 100,
        time: 100,
        socialSupport: 50,
        mentalHealth: 70,
        physicalHealth: 80,
      },
      socialContext: {
        derivedFromImport: true,
      },
      appearance: {
        suggestedPalette: ["#3b82f6", "#a855f7", "#22d3ee"],
      },
      isPlayable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
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

  const formData = await request.formData()
  const file = formData.get("twineFile")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing Twine export. Attach a .zip, .json, or .html file." }, { status: 400 })
  }

  const overridesInput = formData.get("overrides")
  let overrides: ImportOverrides = {}
  if (typeof overridesInput === "string" && overridesInput.trim().length) {
    try {
      overrides = importOverridesSchema.parse(JSON.parse(overridesInput))
    } catch (error) {
      const zodError = error as z.ZodError
      const message = zodError.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') || "Invalid overrides payload."
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  let twison: TwisonStory
  try {
    twison = await loadTwisonFromFile(file)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to read Twine export." }, { status: 400 })
  }

  twison = repairTwisonStory(twison)

  const validation = validateTwisonStory(twison)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 })
  }

  try {
    await ensureStoryIdentifierAvailable(twison, overrides)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Story identifier already in use." }, { status: 409 })
  }

  let payload: StoryPayload
  try {
    const storyOverrides = {
      slug: overrides.slug,
      title: overrides.title,
      summary: overrides.summary,
      tags: overrides.tags,
      visibility: overrides.visibility,
    }
    payload = convertTwisonToStoryPayload(twison, storyOverrides)
    const convertedValidation = validateConvertedPayload(payload)
    if (!convertedValidation.ok) {
      throw new Error(convertedValidation.message)
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to convert Twine story." }, { status: 400 })
  }

  const story = await upsertStoryGraph(session.user.id, payload)

  // Handle avatar creation separately 
  if (overrides.avatar) {
    await upsertAvatarFromMetadata(session.user.id, story.id, overrides.avatar, story.title)
  } else {
    // Auto-generate basic avatar if none provided
    await maybeAttachAutoAvatar(session.user.id, story.id, payload, twison)
  }

  return NextResponse.json(
    {
      storyId: story.id,
      slug: story.slug,
      title: story.title,
      nodes: payload.nodes.length,
      paths: payload.paths.length,
      hasAvatar: Boolean(overrides.avatar),
    },
    { status: 201 },
  )
}

async function ensureStoryIdentifierAvailable(twison: TwisonStory, overrides: ImportOverrides) {
  const slugCandidate = overrides.slug ?? slugify(twison.name ?? "")
  if (!slugCandidate) {
    throw new Error("Unable to derive a story code from the Twine story. Provide a code override before importing.")
  }

  const existingSlug = await prisma.twineStory.findUnique({
    where: { slug: slugCandidate },
    select: { id: true },
  })
  if (existingSlug) {
    throw new Error(`Story code '${slugCandidate}' is already in use. Please choose a different code in the import form.`)
  }

  const titleCandidate = overrides.title ?? twison.name ?? ""
  if (!titleCandidate.trim()) {
    throw new Error("Your Twine story needs a title. Set one in Twine or provide a title override before importing.")
  }

  const existingTitle = await prisma.twineStory.findFirst({
    where: { title: titleCandidate },
    select: { id: true },
  })
  if (existingTitle) {
    throw new Error(`A story titled '${titleCandidate}' already exists. Provide a unique title in Twine or via override.`)
  }
}

function validateConvertedPayload(payload: StoryPayload): { ok: true } | { ok: false; message: string } {
  if (!payload.nodes.length) {
    return { ok: false, message: "Converted story has no nodes. Ensure at least one passage exists in Twine." }
  }

  const nodeKeys = new Set(payload.nodes.map((node) => node.key))
  if (nodeKeys.size !== payload.nodes.length) {
    return { ok: false, message: "Converted story contains duplicate node keys. Check for duplicate passage names in Twine." }
  }

  if (!payload.paths.length) {
    return { ok: false, message: "Converted story has no paths. Add at least one link in Twine." }
  }

  if (!payload.transitions.length) {
    return { ok: false, message: "Converted story has no transitions. Add links between passages in Twine." }
  }

  return { ok: true }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
}