import { NextResponse } from "next/server"


import { prisma } from "@/lib/server/prisma"
import { resolveRuntimeConfigFromSources } from "@/lib/server/story-runtime"
export const dynamic = "force-dynamic"




interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: "Missing avatar id." }, { status: 400 })
  }

  const avatar = await prisma.avatarProfile.findUnique({
    where: { id },
  })

  if (!avatar) {
    return NextResponse.json({ error: "Avatar not found." }, { status: 404 })
  }

  if (!avatar.storyId) {
    return NextResponse.json({ avatar, story: null, nodes: [], paths: [], transitions: [], storyRuntime: null })
  }

  const story = await prisma.twineStory.findUnique({
    where: { id: avatar.storyId },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      tags: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
      latestVersion: {
        select: {
          metadata: true,
          content: true,
        },
      },
    },
  })

  if (!story) {
    return NextResponse.json({ avatar, story: null, nodes: [], paths: [], transitions: [], storyRuntime: null })
  }

  const [nodes, paths, transitions, matchingScenario] = await Promise.all([
    prisma.storyNode.findMany({
      where: { storyId: story.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.storyPath.findMany({
      where: { storyId: story.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.storyTransition.findMany({
      where: { storyId: story.id },
      orderBy: [{ fromNodeId: "asc" }, { ordering: "asc" }],
    }),
    typeof prisma.scenario?.findFirst === "function"
      ? prisma.scenario.findFirst({
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
      : Promise.resolve(null),
  ])

  const storyRuntime = resolveRuntimeConfigFromSources({
    scenarioMetadata: matchingScenario?.metadata ?? null,
    versionMetadata: story.latestVersion?.metadata,
    versionContent: story.latestVersion?.content,
  })

  return NextResponse.json({ avatar, story, nodes, paths, transitions, storyRuntime })
}
