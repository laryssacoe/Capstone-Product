import { NextResponse } from "next/server"

import { cachePolicy, setCacheControl } from "@/lib/http-cache"
import { prisma } from "@/lib/server/prisma"
import { resolveRuntimeConfigFromSources } from "@/lib/server/story-runtime"
export const dynamic = "force-dynamic"

interface RouteParams {
  params: { slug: string }
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { slug } = params
  if (!slug) {
    return NextResponse.json({ error: "Missing story slug" }, { status: 400 })
  }

  const story = await prisma.twineStory.findFirst({
    where: { slug },
    include: {
      nodes: { orderBy: { createdAt: "asc" } },
      paths: { orderBy: { createdAt: "asc" } },
      transitions: { orderBy: [{ fromNodeId: "asc" }, { ordering: "asc" }] },
      avatars: true,
      latestVersion: {
        select: {
          metadata: true,
          content: true,
        },
      },
    },
  })

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 })
  }

  const attachedAvatar =
    story.avatars.find((a) => a.isPlayable) ??
    story.avatars[0] ??
    (await prisma.avatarProfile.findFirst({
      where: { storyId: story.id },
      orderBy: [{ isPlayable: "desc" }, { updatedAt: "desc" }],
    }))

  let scenarioMetadata: unknown = null
  if (typeof prisma.scenario?.findFirst === "function") {
    const matchingScenario = await prisma.scenario.findFirst({
      where: {
        OR: [
          { id: story.slug },
          { id: story.id },
          { metadata: { path: ["storySlug"], equals: story.slug } },
          { metadata: { path: ["storyId"], equals: story.id } },
        ],
      },
      select: { metadata: true },
    })
    scenarioMetadata = matchingScenario?.metadata ?? null
  }

  const storyRuntime = resolveRuntimeConfigFromSources({
    scenarioMetadata,
    versionMetadata: story.latestVersion?.metadata,
    versionContent: story.latestVersion?.content,
  })

  const response = NextResponse.json(
    {
      avatar: attachedAvatar ?? null,
      story,
      nodes: story.nodes,
      paths: story.paths,
      transitions: story.transitions,
      storyRuntime,
    },
  )
  return setCacheControl(response, cachePolicy.storyPublic)
}
