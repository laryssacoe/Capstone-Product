import { z } from "zod"

import { prisma } from "@/lib/server/prisma"

const storyChoiceEffectsSchema = z
  .object({
    money: z.number().optional(),
    health: z.number().optional(),
    mentalHealth: z.number().optional(),
    support: z.number().optional(),
    time: z.number().optional(),
  })
  .partial()

const storyChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().optional(),
  leads_to: z.string().min(1).optional(),
  effects: storyChoiceEffectsSchema.optional(),
})

const storyNodeContentSchema = z
  .object({
    text: z.union([z.array(z.string()), z.string()]).optional(),
    choices: z.array(storyChoiceSchema).optional(),
    next: z.string().optional(),
    emotion: z.string().optional(),
    intensity: z.number().optional(),
  })
  .passthrough()
  .optional()

const storyNodeMediaSchema = z
  .object({
    visual: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    audio: z.string().nullable().optional(),
  })
  .passthrough()
  .optional()

export const storyNodeSchema = z.object({
  key: z.string().min(1),
  title: z.string().optional(),
  synopsis: z.string().optional(),
  type: z.enum(["NARRATIVE", "DECISION", "RESOLUTION"]).optional(),
  content: storyNodeContentSchema,
  media: storyNodeMediaSchema,
})

export const storyPathSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1).optional(),
  summary: z.string().optional(),
  metadata: z.unknown().optional(),
})

export const storyTransitionSchema = z.object({
  from: z.string().min(1),
  path: z.string().min(1),
  to: z.string().nullable().optional(),
  ordering: z.number().int().optional(),
  condition: z.unknown().optional(),
  effect: z.unknown().optional(),
})

export const storyPayloadSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/i, "Story code must be URL safe."),
  title: z.string().min(1),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).optional(),
  nodes: z.array(storyNodeSchema).min(1),
  paths: z.array(storyPathSchema).min(1),
  transitions: z.array(storyTransitionSchema).min(1),
})

export type StoryPayload = z.infer<typeof storyPayloadSchema>

export const storyUpdatePayloadSchema = storyPayloadSchema.extend({
  storyId: z.string().min(1),
})

export type StoryUpdatePayload = z.infer<typeof storyUpdatePayloadSchema>

export async function upsertStoryGraph(
  ownerId: string,
  payload: StoryPayload,
  options?: { storyId?: string; enforceVisibility?: "PRIVATE" | "UNLISTED" | "PUBLIC" },
) {
  const { slug, title, summary, tags = [], visibility = "PRIVATE", nodes, paths, transitions } = payload
  const resolvedVisibility = options?.enforceVisibility ?? visibility

  const normalizeEffects = (effects: unknown) => {
    if (!effects || typeof effects !== "object") return undefined
    const data = effects as Record<string, unknown>
    const normalized: Record<string, number> = {}
    const keys: (keyof typeof normalized)[] = ["money", "health", "mentalHealth", "support", "time"]
    keys.forEach((key) => {
      const value = data[key]
      if (typeof value === "number" && Number.isFinite(value)) {
        normalized[key] = value
      }
    })
    return Object.keys(normalized).length ? normalized : undefined
  }

  const normalizeMedia = (media: unknown) => {
    if (!media || typeof media !== "object") return undefined
    const raw = media as Record<string, unknown>
    const visual =
      (typeof raw.visual === "string" && raw.visual.trim()) ||
      (typeof raw.image === "string" && raw.image.trim()) ||
      undefined
    const audio = typeof raw.audio === "string" && raw.audio.trim() ? raw.audio.trim() : undefined
    const normalized: Record<string, string> = {}
    if (visual) normalized.visual = visual
    if (audio) normalized.audio = audio
    return Object.keys(normalized).length ? normalized : undefined
  }

  const normalizeContent = (content: unknown) => {
    if (!content || typeof content !== "object") return undefined
    const raw = content as Record<string, any>
    const normalized: Record<string, any> = { ...raw }

    const text = raw.text
    if (Array.isArray(text)) {
      normalized.text = text.map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
    } else if (typeof text === "string") {
      const paragraphs = text
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
      normalized.text = paragraphs.length ? paragraphs : [text.trim()]
    }

    if (Array.isArray(raw.choices)) {
      normalized.choices = raw.choices.map((choice: any, index: number) => {
        const idCandidate =
          (typeof choice?.id === "string" && choice.id.trim()) ||
          (typeof choice?.path === "string" && choice.path.trim()) ||
          `choice-${index + 1}`
        const leadsTo =
          (typeof choice?.leads_to === "string" && choice.leads_to.trim()) ||
          (typeof choice?.to === "string" && choice.to.trim()) ||
          (typeof choice?.target === "string" && choice.target.trim()) ||
          undefined

        return {
          id: idCandidate,
          text: typeof choice?.text === "string" ? choice.text : idCandidate,
          leads_to: leadsTo,
          effects: normalizeEffects(choice?.effects),
        }
      })
    }

    if (typeof raw.next === "string") {
      normalized.next = raw.next
    }

    if (typeof raw.emotion === "string") {
      normalized.emotion = raw.emotion
    }

    if (typeof raw.intensity === "number") {
      normalized.intensity = raw.intensity
    }

    return normalized
  }

  const [creatorProfile, userProfile, ownerAccount] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId: ownerId } }),
    prisma.userProfile.findUnique({ where: { userId: ownerId } }),
    prisma.user.findUnique({ where: { id: ownerId }, select: { username: true, email: true } }),
  ])

  const creditName =
    creatorProfile?.penName ??
    userProfile?.displayName ??
    ownerAccount?.username ??
    ownerAccount?.email ??
    "Loop creator"
  const creditText = `Created by ${creditName}`

  let story

  if (options?.storyId) {
    story = await prisma.twineStory.update({
      where: { id: options.storyId },
      data: {
        slug,
        title,
        summary,
        tags,
        visibility: resolvedVisibility,
        creditText,
      },
    })
  } else {
    story = await prisma.twineStory.upsert({
      where: { slug },
      update: {
        title,
        summary,
        tags,
        visibility: resolvedVisibility,
        ownerId,
        creditText,
      },
      create: {
        slug,
        title,
        summary,
        tags,
        visibility: resolvedVisibility,
        ownerId,
        originalCreatorId: ownerId,
        originalCreatorProfileId: creatorProfile?.id ?? null,
        creditText,
        ownershipStatus: "CREATOR_DRAFT",
      },
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.storyTransition.deleteMany({ where: { storyId: story.id } })
    await tx.storyPath.deleteMany({ where: { storyId: story.id } })
    await tx.storyNode.deleteMany({ where: { storyId: story.id } })

    await tx.storyNode.createMany({
      data: nodes.map((node) => {
        const normalizedContent = normalizeContent(node.content)
        const normalizedMedia = normalizeMedia(node.media)
        return {
          storyId: story.id,
          key: node.key,
          title: node.title ?? null,
          synopsis: node.synopsis ?? null,
          type: node.type ?? "NARRATIVE",
          content: normalizedContent ?? undefined,
          media: normalizedMedia ?? undefined,
        }
      }),
    })

    const nodeKeyToId = new Map(
      (
        await tx.storyNode.findMany({
          where: { storyId: story.id },
          select: { id: true, key: true },
        })
      ).map((node) => [node.key, node.id]),
    )

    await tx.storyPath.createMany({
      data: paths.map((path) => ({
        storyId: story.id,
        key: path.key,
        label: path.label ?? path.key,
        summary: path.summary ?? null,
        metadata: path.metadata ?? undefined,
      })),
    })

    const pathKeyToId = new Map(
      (
        await tx.storyPath.findMany({
          where: { storyId: story.id },
          select: { id: true, key: true },
        })
      ).map((path) => [path.key, path.id]),
    )

    const transitionData = transitions.flatMap((transition) => {
      const fromId = nodeKeyToId.get(transition.from)
      if (!fromId) return []
      const pathId = pathKeyToId.get(transition.path)
      if (!pathId) return []
      const toId = transition.to ? nodeKeyToId.get(transition.to) : null

      return [
        {
          storyId: story.id,
          fromNodeId: fromId,
          toNodeId: toId,
          pathId,
          ordering: transition.ordering ?? null,
          condition: transition.condition ?? undefined,
          effect: transition.effect ?? undefined,
        },
      ]
    })

    if (transitionData.length) {
      await tx.storyTransition.createMany({ data: transitionData })
    }
  })

  return story
}
