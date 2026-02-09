"use client"

import { useMemo } from "react"
import {
  StoryPreviewError,
  StoryPreviewPlayer,
  type PreviewGraph,
  type StoryNode,
} from "@/components/creator/story-preview-player"

interface StoryDraftPreviewProps {
  graphJson: string
  storyTitle?: string
  onExit?: () => void
  embedded?: boolean
}

const parseGraph = (raw: string, storyTitle: string): PreviewGraph | null => {
  try {
    const parsed = JSON.parse(raw)
    // Keep preview strict: only render when the core graph arrays are present
    if (!parsed || typeof parsed !== "object") return null
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.paths) || !Array.isArray(parsed.transitions)) {
      return null
    }

    // Normalize draft nodes into the PreviewGraph shape used by the player
    const nodes: StoryNode[] = parsed.nodes.map((node: any) => ({
      id: String(node.id ?? node.key),
      key: String(node.key),
      title: node.title ?? node.key,
      type: node.type ?? "NARRATIVE",
      content: node.content,
      media: node.media ?? node.content?.media,
    }))

    const researchSources = Array.isArray(parsed.metadata?.researchSources)
      ? parsed.metadata.researchSources.filter(
          (source: any) => source && typeof source.citation === "string" && typeof source.id === "string",
        )
      : undefined
    const tags = Array.isArray(parsed.tags) ? parsed.tags.filter((tag: any) => typeof tag === "string") : undefined
    const initialResources =
      parsed.initialResources && typeof parsed.initialResources === "object" ? parsed.initialResources : undefined

    return {
      story: {
        title: storyTitle || "Draft Preview",
        tags,
        researchSources,
      },
      nodes,
      initialResources,
    }
  } catch {
    return null
  }
}

export default function StoryDraftPreview({
  graphJson,
  storyTitle = "Draft Preview",
  onExit,
  embedded = false,
}: StoryDraftPreviewProps) {
  const graph = useMemo(() => parseGraph(graphJson, storyTitle), [graphJson, storyTitle])

  if (!graph) {
    return (
      <StoryPreviewError
        message="Graph JSON is invalid. Switch to JSON mode to fix it."
        onExit={onExit}
        exitLabel={onExit ? "Back to Builder" : undefined}
        embedded={embedded}
      />
    )
  }

  if (graph.nodes.length === 0) {
    return (
      <StoryPreviewError
        message="No nodes found in this draft."
        onExit={onExit}
        exitLabel={onExit ? "Back to Builder" : undefined}
        embedded={embedded}
      />
    )
  }

  return (
    <StoryPreviewPlayer
      graph={graph}
      onExit={onExit}
      exitLabel={onExit ? "Back to Builder" : undefined}
      badgeLabel="Creator Preview Mode"
      embedded={embedded}
    />
  )
}
