import { NextResponse } from "next/server"


import { cachePolicy, setCacheControl } from "@/lib/http-cache"
import { ensureBaseContent } from "@/lib/server/bootstrap"
import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
export const dynamic = "force-dynamic"




interface RouteParams {
  params: {
    slug: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = params
  if (!slug) {
    return NextResponse.json({ error: "Missing story code." }, { status: 400 })
  }

  await ensureBaseContent()

  const session = await getCurrentSession()

  const story = await prisma.twineStory.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      tags: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 })
  }

  const isOwner = session?.user?.id && story.ownerId && session.user.id === story.ownerId
  const isPublic = story.visibility === "PUBLIC"
  if (!isPublic && !isOwner) {
    return NextResponse.json({ error: "Not authorized to view this story." }, { status: 403 })
  }

  const [nodes, paths, transitions, avatars, matchingScenario] = await Promise.all([
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
    prisma.avatarProfile.findMany({
      where: { storyId: story.id },
      orderBy: [{ isPlayable: "desc" }, { updatedAt: "desc" }],
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

  const avatar = avatars.find((a) => a.isPlayable) ?? avatars[0] ?? null
  let storyRuntime: unknown = null
  if (
    matchingScenario?.metadata &&
    typeof matchingScenario.metadata === "object" &&
    !Array.isArray(matchingScenario.metadata)
  ) {
    const metadata = matchingScenario.metadata as Record<string, unknown>
    storyRuntime = metadata.storyRuntime ?? metadata.simulation ?? null
  }

  const response = NextResponse.json({ story, nodes, paths, transitions, avatar, storyRuntime })
  return setCacheControl(response, isPublic ? cachePolicy.collectionPublic : cachePolicy.privateNoStore)
}
