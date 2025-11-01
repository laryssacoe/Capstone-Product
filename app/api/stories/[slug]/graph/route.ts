import { NextResponse } from "next/server"

import { ensureBaseContent } from "@/lib/server/bootstrap"
import { prisma } from "@/lib/server/prisma"

interface RouteParams {
  params: {
    slug: string
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = params
  if (!slug) {
    return NextResponse.json({ error: "Missing story code." }, { status: 400 })
  }

  await ensureBaseContent()

  const story = await prisma.twineStory.findUnique({
    where: { slug },
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
    return NextResponse.json({ error: "Story not found." }, { status: 404 })
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

  return NextResponse.json({ story, nodes, paths, transitions })
}
