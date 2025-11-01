import { NextResponse } from "next/server"

import { ensureBaseContent } from "@/lib/server/bootstrap"
import { prisma } from "@/lib/server/prisma"

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

  await ensureBaseContent()

  const avatar = await prisma.avatarProfile.findUnique({
    where: { id },
  })

  if (!avatar) {
    return NextResponse.json({ error: "Avatar not found." }, { status: 404 })
  }

  if (!avatar.storyId) {
    return NextResponse.json({ avatar, story: null, nodes: [], paths: [], transitions: [] })
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
    },
  })

  if (!story) {
    return NextResponse.json({ avatar, story: null, nodes: [], paths: [], transitions: [] })
  }

  const [nodes, paths, transitions] = await Promise.all([
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
  ])

  return NextResponse.json({ avatar, story, nodes, paths, transitions })
}
