import { NextResponse } from "next/server"

import { prisma } from "@/lib/server/prisma"
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

  return NextResponse.json(
    {
      avatar: attachedAvatar ?? null,
      story,
      nodes: story.nodes,
      paths: story.paths,
      transitions: story.transitions,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  )
}
