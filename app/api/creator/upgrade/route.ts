import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
import { StoryNodeType } from "@/src/generated/prisma/client"

export const dynamic = "force-dynamic"

// Simple example story that demonstrates Loop's structure
const exampleStoryData = {
  slug: "my-first-story",
  title: "My First Story (Example)",
  summary: "A simple example showing how Loop stories work. Edit or delete this anytime!",
  tags: ["example"],
  visibility: "PRIVATE" as const,
}

const exampleNodes = [
  {
    key: "start",
    title: "The Beginning",
    type: StoryNodeType.NARRATIVE,
    content: {
      text: [
        "This is your first passage. It introduces the situation and sets the scene.",
        "Edit this text to tell your own story!",
      ],
      emotion: "neutral",
      intensity: 0.5,
      choices: [
        {
          id: "choice-a",
          text: "Choose Option A",
          leads_to: "option-a-explanation",
          effects: { time: -10 },
        },
        {
          id: "choice-b",
          text: "Choose Option B",
          leads_to: "option-b-explanation",
          effects: { money: -5 },
        },
      ],
    },
  },
  {
    key: "option-a-explanation",
    title: "You Chose Option A",
    type: StoryNodeType.NARRATIVE,
    content: {
      text: [
        "This passage explains what happens right after choosing Option A.",
        "Use passages like this to show immediate consequences or reactions.",
      ],
      emotion: "anticipation",
      intensity: 0.5,
      next: "option-a-result",
    },
  },
  {
    key: "option-b-explanation",
    title: "You Chose Option B",
    type: StoryNodeType.NARRATIVE,
    content: {
      text: [
        "This passage explains what happens right after choosing Option B.",
        "The Continue button lets readers absorb information at their own pace.",
      ],
      emotion: "anticipation",
      intensity: 0.5,
      next: "option-b-result",
    },
  },
  {
    key: "option-a-result",
    title: "Option A Result",
    type: StoryNodeType.NARRATIVE,
    content: {
      text: [
        "Now we see the outcome of Option A.",
        "In a real story, describe the full consequences of this choice.",
      ],
      emotion: "hope",
      intensity: 0.6,
      next: "reflection",
    },
  },
  {
    key: "option-b-result",
    title: "Option B Result",
    type: StoryNodeType.NARRATIVE,
    content: {
      text: [
        "Now we see the outcome of Option B.",
        "Each choice can lead to unique consequences and story branches.",
      ],
      emotion: "tension",
      intensity: 0.5,
      next: "reflection",
    },
  },
  {
    key: "reflection",
    title: "A Moment to Reflect",
    type: StoryNodeType.RESOLUTION,
    content: {
      text: [
        "This is the final passage where the story concludes.",
        "Use RESOLUTION type passages for endings and reflection moments.",
        "This is the end of the example. Now go create your own story!",
      ],
      emotion: "reflection",
      intensity: 0.4,
    },
  },
]

const examplePaths = [
  { key: "choice-a", label: "Choose Option A" },
  { key: "choice-b", label: "Choose Option B" },
  { key: "continue", label: "Continue" },
]

const exampleTransitions = [
  { from: "start", to: "option-a-explanation", path: "choice-a", ordering: 0 },
  { from: "start", to: "option-b-explanation", path: "choice-b", ordering: 1 },
  { from: "option-a-explanation", to: "option-a-result", path: "continue", ordering: 0 },
  { from: "option-b-explanation", to: "option-b-result", path: "continue", ordering: 0 },
  { from: "option-a-result", to: "reflection", path: "continue", ordering: 0 },
  { from: "option-b-result", to: "reflection", path: "continue", ordering: 0 },
]

const exampleAvatar = {
  name: "Protagonist",
  background: "The main character of your story. Edit this to describe who they are.",
  initialResources: {
    money: 100,
    time: 100,
    socialSupport: 50,
    mentalHealth: 70,
    physicalHealth: 80,
  },
  isPlayable: true,
}

async function createExampleStory(userId: string) {
  // Check if example story already exists for this user
  const existing = await prisma.twineStory.findFirst({
    where: {
      ownerId: userId,
      slug: exampleStoryData.slug,
    },
  })

  if (existing) {
    return existing
  }

  // Create the story
  const storyId = randomUUID()
  const now = new Date()

  const story = await prisma.twineStory.create({
    data: {
      id: storyId,
      slug: exampleStoryData.slug,
      title: exampleStoryData.title,
      summary: exampleStoryData.summary,
      tags: exampleStoryData.tags,
      visibility: exampleStoryData.visibility,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    },
  })

  // Create nodes
  const nodeIdMap = new Map<string, string>()
  for (const node of exampleNodes) {
    const nodeId = randomUUID()
    nodeIdMap.set(node.key, nodeId)
    
    await prisma.storyNode.create({
      data: {
        id: nodeId,
        storyId,
        key: node.key,
        title: node.title,
        type: node.type,
        content: node.content,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  // Create paths
  const pathIdMap = new Map<string, string>()
  for (const path of examplePaths) {
    const pathId = randomUUID()
    pathIdMap.set(path.key, pathId)
    
    await prisma.storyPath.create({
      data: {
        id: pathId,
        storyId,
        key: path.key,
        label: path.label,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  // Create transitions
  for (const transition of exampleTransitions) {
    const fromNodeId = nodeIdMap.get(transition.from)
    const toNodeId = transition.to ? nodeIdMap.get(transition.to) : null
    const pathId = pathIdMap.get(transition.path)

    if (fromNodeId && pathId) {
      await prisma.storyTransition.create({
        data: {
          id: randomUUID(),
          storyId,
          fromNodeId,
          toNodeId,
          pathId,
          ordering: transition.ordering,
          createdAt: now,
          updatedAt: now,
        },
      })
    }
  }

  // Create avatar profile
  await prisma.avatarProfile.create({
    data: {
      id: randomUUID(),
      storyId,
      name: exampleAvatar.name,
      background: exampleAvatar.background,
      initialResources: exampleAvatar.initialResources,
      appearance: {},
      socialContext: {},
      isPlayable: exampleAvatar.isPlayable,
      createdAt: now,
      updatedAt: now,
    },
  })

  return story
}

function hasDeletedStarterStory(preferences: unknown): boolean {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return false
  return (preferences as Record<string, unknown>).starterStoryDeleted === true
}

export async function POST() {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const displayName = session.user.username || session.user.email || "Creator"
    const alreadyCreator = session.user.role === "CREATOR" || session.user.role === "ADMIN"

    let updatedUser = {
      id: session.user.id,
      email: session.user.email ?? null,
      username: session.user.username ?? null,
      role: session.user.role,
    }

    // Upgrade user to creator role and ensure profile consent
    if (!alreadyCreator) {
      updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          role: "CREATOR",
          profile: {
            upsert: {
              update: { consentAcceptedAt: now },
              create: { consentAcceptedAt: now, displayName },
            },
          },
        },
        select: { id: true, email: true, username: true, role: true },
      })
    }

    // Optionally create creator profile if delegate exists
    if (typeof prisma.creatorProfile?.findUnique === "function") {
      const existingProfile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
      })

      if (!existingProfile && typeof prisma.creatorProfile?.create === "function") {
        await prisma.creatorProfile.create({
          data: {
            id: randomUUID(),
            userId: session.user.id,
            status: "REVIEW",
            createdAt: now,
            updatedAt: now,
          },
        })
      }
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { preferences: true },
    })
    const shouldSkipStarterStory = hasDeletedStarterStory(profile?.preferences)

    // Ensure a starter example story exists (new or pre-existing creators),
    // unless the creator already deleted it.
    try {
      if (
        !shouldSkipStarterStory &&
        typeof prisma.twineStory?.findFirst === "function" &&
        typeof prisma.twineStory?.create === "function"
      ) {
        await createExampleStory(session.user.id)
      }
    } catch (storyError) {
      console.error("[api/creator/upgrade] Failed to create example story:", storyError)
    }

    return NextResponse.json({ 
      user: updatedUser,
      alreadyUpgraded: alreadyCreator,
    }, { status: 200 })
  } catch (error) {
    console.error("[api/creator/upgrade] Failed to upgrade user:", error)
    return NextResponse.json(
      { error: "Failed to upgrade account. Please try again." },
      { status: 500 }
    )
  }
}
