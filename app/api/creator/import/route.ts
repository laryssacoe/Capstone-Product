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

const importOverridesSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/i, "Story code must be URL safe.").optional(),
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).optional(),
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

async function maybeAttachAvatar(
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

  const background = firstNode.content && typeof firstNode.content === "object" ? (firstNode.content as any).text : ""
  if (!background) return

  await prisma.avatarProfile.create({
    data: {
      id: randomUUID(),
      storyId,
      name: firstNode.title ?? twison.name ?? "Story Protagonist",
      background: background.slice(0, 240),
      initialResources: {
        empathy: 60,
        resilience: 55,
        communitySupport: 50,
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
      return NextResponse.json({ error: "Invalid overrides payload." }, { status: 400 })
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
    payload = convertTwisonToStoryPayload(twison, overrides)
    const convertedValidation = validateConvertedPayload(payload)
    if (!convertedValidation.ok) {
      throw new Error(convertedValidation.message)
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to convert Twine story." }, { status: 400 })
  }

  const story = await upsertStoryGraph(session.user.id, payload)
  await maybeAttachAvatar(session.user.id, story.id, payload, twison)

  return NextResponse.json(
    {
      storyId: story.id,
      slug: story.slug,
      title: story.title,
      nodes: payload.nodes.length,
      paths: payload.paths.length,
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
