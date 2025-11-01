import { z } from "zod"

import { prisma } from "@/lib/server/prisma"

export const storyNodeSchema = z.object({
  key: z.string().min(1),
  title: z.string().optional(),
  synopsis: z.string().optional(),
  type: z.enum(["NARRATIVE", "DECISION", "RESOLUTION"]).optional(),
  content: z.unknown().optional(),
  media: z.unknown().optional(),
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

  await prisma.storyTransition.deleteMany({ where: { storyId: story.id } })
  await prisma.storyPath.deleteMany({ where: { storyId: story.id } })
  await prisma.storyNode.deleteMany({ where: { storyId: story.id } })

  const nodeKeyToId = new Map<string, string>()
  for (const node of nodes) {
    const created = await prisma.storyNode.create({
      data: {
        storyId: story.id,
        key: node.key,
        title: node.title ?? null,
        synopsis: node.synopsis ?? null,
        type: node.type ?? "NARRATIVE",
        content: node.content ?? undefined,
        media: node.media ?? undefined,
      },
    })
    nodeKeyToId.set(node.key, created.id)
  }

  const pathKeyToId = new Map<string, string>()
  for (const path of paths) {
    const created = await prisma.storyPath.create({
      data: {
        storyId: story.id,
        key: path.key,
        label: path.label ?? path.key,
        summary: path.summary ?? null,
        metadata: path.metadata ?? undefined,
      },
    })
    pathKeyToId.set(path.key, created.id)
  }

  for (const transition of transitions) {
    const fromId = nodeKeyToId.get(transition.from)
    if (!fromId) continue
    const pathId = pathKeyToId.get(transition.path)
    if (!pathId) continue
    const toId = transition.to ? nodeKeyToId.get(transition.to) : undefined

    await prisma.storyTransition.create({
      data: {
        storyId: story.id,
        fromNodeId: fromId,
        toNodeId: toId,
        pathId,
        ordering: transition.ordering ?? null,
        condition: transition.condition ?? undefined,
        effect: transition.effect ?? undefined,
      },
    })
  }

  return story
}
