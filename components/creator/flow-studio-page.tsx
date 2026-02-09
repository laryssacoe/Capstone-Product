"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import StoryFlowBuilder from "@/components/creator/story-flow-builder"
import type { FlowConnectionSelection } from "@/components/creator/story-flow-builder"
import StoryDraftPreview from "@/components/creator/story-draft-preview"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToastAction } from "@/components/ui/toast"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowRight,
  Code,
  Eye,
  Flag,
  GitBranch,
  GripVertical,
  ImageIcon,
  Maximize2,
  Plus,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

interface FlowStudioPageProps {
  graphJson: string
  onGraphJsonChange: (next: string) => void
  storyTitle: string
  onClose: () => void
  onMediaUploaded?: (item: {
    name: string
    type: "image" | "audio"
    url: string
    serverPath: string
    mappedToNode?: string
  }) => void
  onDone?: () => void
}

const nodeTypes = [
  { value: "NARRATIVE", label: "Narrative", icon: ImageIcon, color: "bg-blue-500" },
  { value: "DECISION", label: "Decision", icon: GitBranch, color: "bg-purple-500" },
  { value: "RESOLUTION", label: "Resolution", icon: Flag, color: "bg-emerald-500" },
] as const

type EditorChoice = {
  id: string
  text: string
  leads_to: string
  effects?: Record<string, number>
}

type EditorNode = {
  key: string
  title: string
  type: (typeof nodeTypes)[number]["value"]
  text: string
  next: string
  choices: EditorChoice[]
  visual: string
  audio: string
  contentExtras: Record<string, unknown>
}

type GraphInitialResources = {
  money?: number
  time?: number
  health?: number
}

type GraphPayload = {
  nodes: Array<{ key: string; title?: string; type?: string; content?: any; media?: any }>
  paths: Array<{ key: string; label?: string }>
  transitions: Array<{ from: string; to?: string | null; path: string; ordering?: number }>
  initialResources?: GraphInitialResources
  [key: string]: unknown
}

const parseGraph = (raw: string) => {
  try {
    const parsed = JSON.parse(raw)
    // Flow Studio requires all three graph arrays to be present
    if (!parsed || typeof parsed !== "object") return null
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.paths) || !Array.isArray(parsed.transitions)) {
      return null
    }
    return parsed as GraphPayload
  } catch {
    return null
  }
}

const min_zoom = 0.35
const max_zoom = 3
const zoom_epsilon = 0.001

const defaultGraphResources = {
  money: 500,
  time: 100,
  health: 100,
}

const nodeKeyBases: Record<(typeof nodeTypes)[number]["value"], string> = {
  NARRATIVE: "scene",
  DECISION: "decision",
  RESOLUTION: "ending",
}

const toTitleCase = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

const getNextNodeKey = (
  type: (typeof nodeTypes)[number]["value"],
  nodes: Array<{ key: string }>,
) => {
  const base = nodeKeyBases[type] ?? "node"
  const existing = new Set(nodes.map((node) => node.key))
  let index = 1
  while (existing.has(`${base}-${index}`)) {
    index += 1
  }
  return `${base}-${index}`
}

const toTextValue = (text?: string | string[]) => {
  if (!text) return ""
  if (Array.isArray(text)) return text.join("\n\n")
  return text
}

const splitText = (input: string) =>
  input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

const syncNodeTransitions = (
  graph: NonNullable<ReturnType<typeof parseGraph>>,
  node: { key: string; content?: any },
) => {
  const content = node.content ?? {}
  const choices = Array.isArray(content.choices) ? content.choices : []
  const next = typeof content.next === "string" ? content.next : ""

  // Rebuild this node's outgoing transitions from editor state
  const transitions = graph.transitions.filter((transition) => transition.from !== node.key)
  const pathMap = new Map(graph.paths.map((path) => [path.key, { ...path }]))

  const upsertPath = (key: string, label: string) => {
    const existing = pathMap.get(key)
    if (existing) {
      pathMap.set(key, { ...existing, label: label || existing.label || key })
    } else {
      pathMap.set(key, { key, label: label || key })
    }
  }

  choices.forEach((choice: EditorChoice, index: number) => {
    upsertPath(choice.id, choice.text || choice.id)
    if (choice.leads_to) {
      transitions.push({
        from: node.key,
        to: choice.leads_to,
        path: choice.id,
        ordering: index,
      })
    }
  })

  if (next) {
    upsertPath("continue", pathMap.get("continue")?.label ?? "Continue")
    transitions.push({
      from: node.key,
      to: next,
      path: "continue",
      ordering: 0,
    })
  }

  const usedPaths = new Set(transitions.map((transition) => transition.path))
  const nextPaths = Array.from(pathMap.values()).filter((path) => usedPaths.has(path.key))

  return { ...graph, paths: nextPaths, transitions }
}

const validateFlowGraph = (graph: NonNullable<ReturnType<typeof parseGraph>>) => {
  if (graph.nodes.length === 0) return { ok: false, message: "Add at least one node." }
  if (graph.paths.length === 0) return { ok: false, message: "Add at least one path/choice." }
  if (graph.transitions.length === 0) return { ok: false, message: "Connect at least one transition." }

  const nodeKeys = new Set(graph.nodes.map((node) => node.key))
  const pathKeys = new Set(graph.paths.map((path) => path.key))
  const incomingCounts = new Map<string, number>()
  graph.nodes.forEach((node) => {
    incomingCounts.set(node.key, 0)
  })
  graph.transitions.forEach((transition) => {
    if (transition.to && incomingCounts.has(transition.to)) {
      incomingCounts.set(transition.to, (incomingCounts.get(transition.to) ?? 0) + 1)
    }
  })
  const entryNodes = graph.nodes.filter((node) => (incomingCounts.get(node.key) ?? 0) === 0)
  const startKey = graph.nodes.find((node) => node.key === "start")?.key ?? entryNodes[0]?.key ?? graph.nodes[0]?.key

  for (const transition of graph.transitions) {
    if (!nodeKeys.has(transition.from)) {
      return { ok: false, message: `Transition from "${transition.from}" points to a missing node.` }
    }
    if (transition.to && !nodeKeys.has(transition.to)) {
      return { ok: false, message: `Transition from "${transition.from}" points to unknown node "${transition.to}".` }
    }
    if (!pathKeys.has(transition.path)) {
      return { ok: false, message: `Transition from "${transition.from}" uses missing path "${transition.path}".` }
    }
  }

  for (const node of graph.nodes) {
    const content = node.content ?? {}
    const text = content.text
    if (!text || (Array.isArray(text) && text.length === 0)) {
      return { ok: false, message: `Node "${node.key}" needs story text.` }
    }

    const outgoing = graph.transitions.filter((transition) => transition.from === node.key && transition.to)
    const uniqueTargets = new Set(outgoing.map((transition) => transition.to))
    if (node.type === "RESOLUTION") {
      if (outgoing.length > 0) {
        return { ok: false, message: `Resolution node "${node.key}" should not lead anywhere.` }
      }
      continue
    }

    if (outgoing.length === 0) {
      return { ok: false, message: `Node "${node.key}" has no outgoing transition.` }
    }

    if (node.type === "NARRATIVE" && uniqueTargets.size > 1 && node.key !== startKey) {
      return { ok: false, message: `Narrative node "${node.key}" should lead to only one node.` }
    }

    if (node.type === "DECISION") {
      const choices = Array.isArray(content.choices) ? content.choices : []
      if (choices.length === 0) {
        return { ok: false, message: `Decision node "${node.key}" needs at least one choice.` }
      }
      for (const choice of choices) {
        if (!choice?.leads_to) {
          return { ok: false, message: `Decision node "${node.key}" has a choice without a target.` }
        }
        const hasTransition = graph.transitions.some(
          (transition) => transition.from === node.key && transition.path === choice.id && transition.to === choice.leads_to,
        )
        if (!hasTransition) {
          return {
            ok: false,
            message: `Decision node "${node.key}" has a choice that isn't connected in the flow.`,
          }
        }
      }
    }
  }

  return { ok: true }
}

const autoFixGraph = (graph: NonNullable<ReturnType<typeof parseGraph>>) => {
  const nodeMap = new Map(graph.nodes.map((node) => [node.key, node]))
  const pathLabelByKey = new Map(graph.paths.map((path) => [path.key, path.label || path.key]))
  const validTransitions = graph.transitions.filter(
    (transition) => transition.to && nodeMap.has(transition.from) && nodeMap.has(transition.to),
  )
  const outgoingByNode = new Map<string, typeof validTransitions>()
  validTransitions.forEach((transition) => {
    const list = outgoingByNode.get(transition.from) ?? []
    list.push(transition)
    outgoingByNode.set(transition.from, list)
  })

  const sanitizedNodes = graph.nodes.map((node) => {
    const content = { ...(node.content ?? {}) }
    const choices = Array.isArray(content.choices) ? content.choices : []
    const next = typeof content.next === "string" ? content.next : ""
    const outgoing = outgoingByNode.get(node.key) ?? []

    if (node.type === "RESOLUTION") {
      delete content.next
      delete content.choices
      return { ...node, content }
    }

    if (node.type === "DECISION") {
      // Keep choices and transitions aligned by path id
      const choiceById = new Map<string, EditorChoice>()
      choices.forEach((choice: EditorChoice, index: number) => {
        if (!choice) return
        const id = String(choice.id || `choice-${index + 1}`)
        choiceById.set(id, { ...choice, id })
      })
      outgoing.forEach((transition, index) => {
        if (transition.path === "continue") return
        const existing = choiceById.get(transition.path)
        const label = existing?.text ?? pathLabelByKey.get(transition.path) ?? `Choice ${index + 1}`
        choiceById.set(transition.path, {
          ...existing,
          id: transition.path,
          text: label,
          leads_to: transition.to ?? "",
        })
      })
      const normalizedChoices = Array.from(choiceById.values())
        .map((choice, index) => ({
          ...choice,
          id: String(choice.id || `choice-${index + 1}`),
          text: String(choice.text ?? choice.id ?? `Choice ${index + 1}`),
          leads_to: typeof choice.leads_to === "string" ? choice.leads_to : "",
        }))
        .filter((choice) => choice.leads_to && nodeMap.has(choice.leads_to))
      content.choices = normalizedChoices
      delete content.next
      return { ...node, content }
    }

    delete content.choices
    let target = next && nodeMap.has(next) ? next : ""
    if (!target && outgoing.length > 0) {
      target = outgoing[0]?.to ?? ""
    }
    if (target && nodeMap.has(target)) {
      content.next = target
    } else {
      delete content.next
    }
    return { ...node, content }
  })

  const transitions: Array<{ from: string; to: string; path: string; ordering?: number }> = []
  const pathMap = new Map<string, { key: string; label?: string }>()
  const upsertPath = (key: string, label: string) => {
    const existing = pathMap.get(key)
    if (existing) {
      pathMap.set(key, { ...existing, label: label || existing.label || key })
    } else {
      pathMap.set(key, { key, label: label || key })
    }
  }

  sanitizedNodes.forEach((node) => {
    const content = node.content ?? {}
    if (node.type === "DECISION") {
      const choices: EditorChoice[] = Array.isArray(content.choices) ? content.choices : []
      choices.forEach((choice: EditorChoice, index: number) => {
        const to = typeof choice.leads_to === "string" ? choice.leads_to : ""
        if (!to || !nodeMap.has(to)) return
        const id = String(choice.id || `choice-${index + 1}`)
        const label = String(choice.text ?? id)
        upsertPath(id, label)
        transitions.push({ from: node.key, to, path: id, ordering: index })
      })
      return
    }

    if (node.type === "RESOLUTION") {
      return
    }

    const next = typeof content.next === "string" ? content.next : ""
    if (next && nodeMap.has(next)) {
      // Non-decision nodes use a normalized "continue" path
      upsertPath("continue", pathMap.get("continue")?.label ?? "Continue")
      transitions.push({ from: node.key, to: next, path: "continue", ordering: 0 })
    }
  })

  return {
    ...graph,
    nodes: sanitizedNodes,
    paths: Array.from(pathMap.values()),
    transitions,
  }
}

export default function FlowStudioPage({
  graphJson,
  onGraphJsonChange,
  storyTitle,
  onClose,
  onMediaUploaded,
  onDone,
}: FlowStudioPageProps) {
  const { toast } = useToast()
  const [mode, setMode] = useState<"builder" | "preview">("builder")
  const [showJson, setShowJson] = useState(false)
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<FlowConnectionSelection | null>(null)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<EditorNode | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState<"image" | "audio" | null>(null)
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null)
  const [graphResourceError, setGraphResourceError] = useState<string | null>(null)
  const [viewportControls, setViewportControls] = useState<{
    zoomIn: () => void
    zoomOut: () => void
    fitView: () => void
    getZoom: () => number
  } | null>(null)
  const imageUploadRef = useRef<HTMLInputElement | null>(null)
  const audioUploadRef = useRef<HTMLInputElement | null>(null)

  const graph = useMemo(() => parseGraph(graphJson), [graphJson])
  const nodeCount = graph?.nodes.length ?? 0
  const transitionCount = graph?.transitions.length ?? 0

  useEffect(() => {
    if (!graph) return
    // Enforce required top-level resources so preview/runtime has deterministic defaults
    const existing = graph.initialResources ?? {}
    const normalized = {
      money: typeof existing.money === "number" ? existing.money : defaultGraphResources.money,
      time: typeof existing.time === "number" ? existing.time : defaultGraphResources.time,
      health: typeof existing.health === "number" ? existing.health : defaultGraphResources.health,
    }
    const needsUpdate =
      typeof existing.money !== "number" ||
      typeof existing.time !== "number" ||
      typeof existing.health !== "number"

    if (needsUpdate) {
      onGraphJsonChange(JSON.stringify({ ...graph, initialResources: normalized }, null, 2))
    }
  }, [graph, onGraphJsonChange])

  const graphResourceValues = useMemo(() => {
    const resources = graph?.initialResources ?? {}
    return {
      money: typeof resources.money === "number" ? resources.money : "",
      time: typeof resources.time === "number" ? resources.time : "",
      health: typeof resources.health === "number" ? resources.health : "",
    }
  }, [graph])

  const updateGraphResource = useCallback(
    (key: keyof GraphInitialResources, rawValue: string) => {
      const numericValue = rawValue === "" ? 0 : Number(rawValue)
      if (!Number.isFinite(numericValue)) {
        setGraphResourceError("Resource values must be numbers.")
        return
      }

      if (!graph) {
        setGraphResourceError("Graph JSON is invalid. Fix it before editing resources.")
        return
      }

      const initialResources =
        graph.initialResources && typeof graph.initialResources === "object" ? graph.initialResources : {}
      const nextGraph = {
        ...graph,
        initialResources: {
          ...initialResources,
          [key]: numericValue,
        },
      }
      onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
      setGraphResourceError(null)
    },
    [graph, onGraphJsonChange],
  )

  useEffect(() => {
    if (mode === "preview") {
      setShowJson(false)
    }
  }, [mode])

  useEffect(() => {
    if (!graph || !selectedNodeKey) return
    if (!graph.nodes.some((node) => node.key === selectedNodeKey)) {
      setSelectedNodeKey(null)
    }
  }, [graph, selectedNodeKey])

  useEffect(() => {
    if (!graph || !selectedConnection) return
    const exists = graph.transitions.some(
      (transition) =>
        transition.from === selectedConnection.from &&
        transition.to === selectedConnection.to &&
        transition.path === selectedConnection.path,
    )
    if (!exists) {
      setSelectedConnection(null)
    }
  }, [graph, selectedConnection])

  const addNode = useCallback(
    (type: (typeof nodeTypes)[number]["value"]) => {
      if (!graph) return
      const newKey = getNextNodeKey(type, graph.nodes)
      const label = nodeTypes.find((n) => n.value === type)?.label ?? "Node"
      const title = `${toTitleCase(nodeKeyBases[type] ?? label)} ${newKey.split("-").pop() ?? ""}`.trim()
      // Seed new nodes with starter content based on node type
      const newNode =
        type === "DECISION"
          ? {
              key: newKey,
              title,
              type,
              content: {
                text: ["What will you do?"],
                choices: [
                  { id: "choice-1", text: "Choice 1", leads_to: "" },
                  { id: "choice-2", text: "Choice 2", leads_to: "" },
                ],
              },
            }
          : {
              key: newKey,
              title,
              type,
              content: {
                text: ["Enter your story text here..."],
                next: "",
              },
            }

      const nextGraph = {
        ...graph,
        nodes: [...graph.nodes, newNode],
      }
      onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
      setSelectedNodeKey(newKey)
    },
    [graph, onGraphJsonChange],
  )

  const deleteNodeByKey = useCallback(
    (nodeKey: string) => {
      if (!graph) return
      const nextNodes = graph.nodes.filter((node) => node.key !== nodeKey)
      const nextTransitions = graph.transitions.filter(
        (transition) => transition.from !== nodeKey && transition.to !== nodeKey,
      )
      const usedPaths = new Set(nextTransitions.map((transition) => transition.path))
      const nextPaths = graph.paths.filter((path) => usedPaths.has(path.key))

      onGraphJsonChange(
        JSON.stringify(
          {
            ...graph,
            nodes: nextNodes,
            paths: nextPaths,
            transitions: nextTransitions,
          },
          null,
          2,
        ),
      )
      setSelectedNodeKey(null)
      setSelectedConnection(null)
      setDrawerOpen(false)
      setEditingNode(null)
      setEditorError(null)
      setMediaUploadError(null)
      setUploadingMedia(null)
    },
    [graph, onGraphJsonChange],
  )

  const deleteSelected = useCallback(() => {
    if (!selectedNodeKey) return
    deleteNodeByKey(selectedNodeKey)
  }, [deleteNodeByKey, selectedNodeKey])

  const deleteEditingNode = useCallback(() => {
    if (!editingNode?.key) return
    deleteNodeByKey(editingNode.key)
  }, [deleteNodeByKey, editingNode?.key])

  const deleteSelectedConnection = useCallback(() => {
    if (!graph || !selectedConnection) return

    const nextTransitions = graph.transitions.filter(
      (transition) =>
        !(
          transition.from === selectedConnection.from &&
          transition.to === selectedConnection.to &&
          transition.path === selectedConnection.path
        ),
    )
    const usedPaths = new Set(nextTransitions.map((transition) => transition.path))
    const nextPaths = graph.paths.filter((path) => usedPaths.has(path.key))

    onGraphJsonChange(
      JSON.stringify(
        {
          ...graph,
          paths: nextPaths,
          transitions: nextTransitions,
        },
        null,
        2,
      ),
    )
    setSelectedConnection(null)
  }, [graph, onGraphJsonChange, selectedConnection])

  const openNodeEditor = useCallback(
    (nodeKey: string) => {
      if (!graph) return
      const node = graph.nodes.find((item) => item.key === nodeKey)
      if (!node) return
      const content = node.content ?? {}
      const { text, choices, next, media, ...contentExtras } = content
      const nodeMedia = node.media ?? (typeof media === "object" ? media : undefined)
      const visual =
        typeof nodeMedia?.visual === "string"
          ? nodeMedia.visual
          : typeof nodeMedia?.image === "string"
            ? nodeMedia.image
            : ""
      const audio = typeof nodeMedia?.audio === "string" ? nodeMedia.audio : ""
      const normalizedChoices: EditorChoice[] = Array.isArray(choices)
        ? choices.map((choice: any, index: number) => ({
            id: String(choice?.id ?? `choice-${index + 1}`),
            text: String(choice?.text ?? choice?.id ?? `Choice ${index + 1}`),
            leads_to: String(choice?.leads_to ?? ""),
            effects: choice?.effects,
          }))
        : []

      setEditingNode({
        key: node.key,
        title: String(node.title ?? node.key),
        type: (node.type as EditorNode["type"]) ?? "NARRATIVE",
        text: toTextValue(text),
        next: typeof next === "string" ? next : "",
        choices: normalizedChoices,
        visual,
        audio,
        contentExtras: { ...contentExtras },
      })
      setEditorError(null)
      setMediaUploadError(null)
      setDrawerOpen(true)
    },
    [graph],
  )

  const updateEditingNode = useCallback((updater: (node: EditorNode) => EditorNode) => {
    setEditingNode((previous) => {
      if (!previous) return previous
      return updater(previous)
    })
  }, [])

  const handleChoiceChange = useCallback(
    (index: number, field: keyof EditorChoice, value: string) => {
      updateEditingNode((node) => {
        const updated = [...node.choices]
        const choice = { ...updated[index], [field]: value }
        updated[index] = choice
        return { ...node, choices: updated }
      })
    },
    [updateEditingNode],
  )

  const addChoice = useCallback(() => {
    updateEditingNode((node) => {
      const nextIndex = node.choices.length + 1
      return {
        ...node,
        choices: [
          ...node.choices,
          {
            id: `choice-${nextIndex}`,
            text: `Choice ${nextIndex}`,
            leads_to: "",
          },
        ],
      }
    })
  }, [updateEditingNode])

  const removeChoice = useCallback(
    (index: number) => {
      updateEditingNode((node) => ({
        ...node,
        choices: node.choices.filter((_, idx) => idx !== index),
      }))
    },
    [updateEditingNode],
  )

  const handleUploadMedia = useCallback(
    async (file: File, type: "image" | "audio") => {
      if (!editingNode) {
        toast({ variant: "destructive", title: "Select a node", description: "Pick a node before uploading media." })
        return
      }

      const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
      const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"]
      const allowedTypes = type === "image" ? allowedImageTypes : allowedAudioTypes

      if (!allowedTypes.includes(file.type)) {
        setMediaUploadError(`Unsupported ${type} type: ${file.name}`)
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setMediaUploadError(`File too large (max 10MB): ${file.name}`)
        return
      }

      setUploadingMedia(type)
      setMediaUploadError(null)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", type)

        const response = await fetch("/api/creator/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        })
        const data = await response.json()

        if (!response.ok) {
          const message = data?.error || `Failed to upload ${file.name}`
          setMediaUploadError(message)
          toast({ variant: "destructive", title: "Upload failed", description: message })
          return
        }

        updateEditingNode((node) =>
          type === "image" ? { ...node, visual: data.path } : { ...node, audio: data.path },
        )

        if (graph) {
          // Mirror drawer changes into graph JSON immediately so external state stays in sync
          const nextNodes = graph.nodes.map((node) => {
            if (node.key !== editingNode.key) return node
            const nextMedia = {
              ...(node.media && typeof node.media === "object" ? node.media : {}),
              ...(type === "image" ? { visual: data.path } : { audio: data.path }),
            }
            return { ...node, media: nextMedia }
          })
          onGraphJsonChange(JSON.stringify({ ...graph, nodes: nextNodes }, null, 2))
        }

        onMediaUploaded?.({
          name: data.filename || file.name,
          type,
          url: data.path,
          serverPath: data.path,
          mappedToNode: editingNode.key,
        })

        toast({
          title: "Upload complete",
          description: `${type === "image" ? "Image" : "Audio"} added to media library.`,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to upload ${file.name}`
        setMediaUploadError(message)
        toast({ variant: "destructive", title: "Upload failed", description: message })
      } finally {
        setUploadingMedia(null)
      }
    },
    [editingNode, graph, onGraphJsonChange, onMediaUploaded, toast, updateEditingNode],
  )

  const handleSaveNode = useCallback(() => {
    if (!graph || !editingNode) return false
    const updatedText = splitText(editingNode.text)
    if (updatedText.length === 0) {
      setEditorError("Add at least one paragraph of text.")
      return false
    }

    // Normalize editor input, then rebuild transitions from content.next/content.choices
    const normalizedChoices = editingNode.choices.map((choice, index) => ({
      id: choice.id.trim() || `choice-${index + 1}`,
      text: (choice.text || choice.id).trim(),
      leads_to: choice.leads_to.trim(),
      effects: choice.effects,
    }))

    const trimmedVisual = editingNode.visual.trim()
    const trimmedAudio = editingNode.audio.trim()
    const media =
      trimmedVisual || trimmedAudio
        ? {
            ...(trimmedVisual ? { visual: trimmedVisual } : {}),
            ...(trimmedAudio ? { audio: trimmedAudio } : {}),
          }
        : undefined

    const { media: _contentMedia, ...safeExtras } = editingNode.contentExtras

    const content =
      editingNode.type === "DECISION"
        ? {
            ...safeExtras,
            text: updatedText,
            choices: normalizedChoices,
          }
        : {
            ...safeExtras,
            text: updatedText,
            next: editingNode.next.trim(),
          }

    const updatedNodes = graph.nodes.map((node) =>
      node.key === editingNode.key
        ? (() => {
            const { media: _existingMedia, ...rest } = node
            return {
              ...rest,
              title: editingNode.title.trim() || node.title || editingNode.key,
              type: editingNode.type,
              content,
              ...(media ? { media } : {}),
            }
          })()
        : node,
    )

    const nextGraph = syncNodeTransitions(
      {
        ...graph,
        nodes: updatedNodes,
      },
      { key: editingNode.key, content },
    )

    onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
    setDrawerOpen(false)
    setEditingNode(null)
    setEditorError(null)
    return true
  }, [editingNode, graph, onGraphJsonChange])

  const handleOpenPreview = useCallback(() => {
    if (editingNode) {
      const saved = handleSaveNode()
      if (!saved) {
        toast({
          variant: "destructive",
          title: "Fix the node before previewing",
          description: "Save the node after resolving the highlighted issues.",
        })
        return
      }
    }
    setMode("preview")
  }, [editingNode, handleSaveNode, toast])
  const handleAutoLayout = useCallback(() => {
    setLayoutVersion((prev) => prev + 1)
    requestAnimationFrame(() => {
      viewportControls?.fitView()
    })
  }, [viewportControls])

  const handleZoomIn = useCallback(() => {
    if (!viewportControls) return
    const current = viewportControls.getZoom()
    if (current >= max_zoom - zoom_epsilon) {
      toast({ title: "Max zoom", duration: 1200 })
      return
    }
    viewportControls.zoomIn()
  }, [toast, viewportControls])

  const handleZoomOut = useCallback(() => {
    if (!viewportControls) return
    const current = viewportControls.getZoom()
    if (current <= min_zoom + zoom_epsilon) {
      toast({ title: "Min zoom", duration: 1200 })
      return
    }
    viewportControls.zoomOut()
  }, [toast, viewportControls])

  const handleAutoFix = useCallback(() => {
    if (!graph) return
    const nextGraph = autoFixGraph(graph)
    onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
    const validation = validateFlowGraph(nextGraph)
    if (!validation.ok) {
      toast({ variant: "destructive", title: "Still needs attention", description: validation.message })
      return
    }
    toast({ title: "Auto-fix applied", description: "Flow connections were normalized." })
  }, [graph, onGraphJsonChange, toast])

  const handleNodeSelectionChange = useCallback((key: string | null) => {
    setSelectedNodeKey(key)
    if (key) {
      setSelectedConnection(null)
    }
    if (key === null) {
      setDrawerOpen(false)
      setEditingNode(null)
      setEditorError(null)
      setMediaUploadError(null)
      setUploadingMedia(null)
    }
  }, [])

  const handleConnectionSelectionChange = useCallback((selection: FlowConnectionSelection | null) => {
    setSelectedConnection(selection)
    if (selection) {
      setSelectedNodeKey(null)
      setDrawerOpen(false)
      setEditingNode(null)
      setEditorError(null)
      setMediaUploadError(null)
      setUploadingMedia(null)
    }
  }, [])

  const handleDone = useCallback(() => {
    if (!graph) {
      toast({ variant: "destructive", title: "Fix the story graph", description: "Graph JSON is invalid." })
      return
    }
    // Prevent leaving Studio until flow-level validation passes
    const validation = validateFlowGraph(graph)
    if (!validation.ok) {
      toast({
        variant: "destructive",
        title: "Story needs attention",
        description: validation.message,
        action: (
          <ToastAction altText="Auto-fix issues" onClick={handleAutoFix}>
            Auto-fix
          </ToastAction>
        ),
      })
      return
    }
    onDone?.()
    onClose()
  }, [graph, handleAutoFix, onClose, onDone, toast])

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
      {mode === "builder" && (
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close Studio
            </Button>
            <span className="text-slate-600">|</span>
            <h2 className="text-white font-medium">{storyTitle || "Untitled Story"}</h2>
            <Badge variant="outline" className="text-slate-400 border-slate-700">
              {nodeCount} nodes · {transitionCount} transitions
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowJson((prev) => !prev)}
              className={showJson ? "bg-slate-800" : ""}
            >
              <Code className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenPreview}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" onClick={handleDone} className="bg-purple-600 hover:bg-purple-700 text-white">
              Done
            </Button>
          </div>
        </header>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {mode === "builder" && (
          <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-4 shrink-0 overflow-y-auto min-h-0">
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">Add Node</h3>
              <div className="space-y-2">
                {nodeTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => addNode(type.value)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${type.color} flex items-center justify-center`}>
                      <type.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-200 text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Initial Resources</h3>
              <div className="space-y-3">
                {graphResourceError && (
                  <div className="text-xs text-red-300">{graphResourceError}</div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Money</Label>
                  <Input
                    type="number"
                    value={graphResourceValues.money}
                    onChange={(event) => updateGraphResource("money", event.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200 h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Time (hours)</Label>
                  <Input
                    type="number"
                    value={graphResourceValues.time}
                    onChange={(event) => updateGraphResource("time", event.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200 h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Health</Label>
                  <Input
                    type="number"
                    value={graphResourceValues.health}
                    onChange={(event) => updateGraphResource("health", event.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200 h-8"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Zoom</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-slate-300 text-sm flex-1 text-center">View</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewportControls?.fitView()}
                className="w-full mt-2 border-indigo-500/50 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Reset View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoLayout}
                className="w-full mt-2 border-amber-500/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
              >
                <GripVertical className="w-4 h-4 mr-2" />
                Auto Layout
              </Button>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Instructions</h3>
              <div className="text-xs text-slate-400 leading-relaxed space-y-2">
                <p>Drag the purple handle to a blue handle to create a connection path between nodes. Click on that same connection and press Delete to remove it.</p>
                <p>Decision nodes create choices automatically while Narrative nodes set a Continue path. To edit or delete each node, click directly on it.</p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Selection</h3>
              {selectedNodeKey || selectedConnection ? (
                <div className="space-y-3">
                  {selectedNodeKey && (
                    <div className="space-y-2">
                      <div className="text-slate-200 text-sm truncate">{selectedNodeKey}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/60 text-red-200 bg-red-900/20 hover:bg-red-900/40"
                        onClick={deleteSelected}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Node
                      </Button>
                    </div>
                  )}

                  {selectedConnection && (
                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      <div className="text-slate-200 text-sm truncate">
                        {selectedConnection.label ?? selectedConnection.path}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {selectedConnection.from} → {selectedConnection.to}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/60 text-red-200 bg-red-900/20 hover:bg-red-900/40"
                        onClick={deleteSelectedConnection}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Connection
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Select a node or connection to see actions.</p>
              )}
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-hidden relative min-h-0">
          {mode === "preview" ? (
            <StoryDraftPreview
              graphJson={graphJson}
              storyTitle={storyTitle || "Draft Preview"}
              onExit={() => setMode("builder")}
              embedded
            />
          ) : (
            <StoryFlowBuilder
              graphJson={graphJson}
              onGraphJsonChange={onGraphJsonChange}
              layout="canvas"
              showToolbar={false}
              showInspector={false}
              showControls={false}
              showMiniMap={false}
              onViewportControls={setViewportControls}
              onSelectionChange={handleNodeSelectionChange}
              onConnectionSelectionChange={handleConnectionSelectionChange}
              onNodeEdit={openNodeEditor}
              layoutToken={layoutVersion}
            />
          )}
        </div>

        {showJson && (
          <aside className="w-96 bg-slate-900 border-l border-slate-800 p-4 overflow-auto shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-400">JSON Output</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowJson(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={graphJson}
              onChange={(event) => onGraphJsonChange(event.target.value)}
              rows={24}
              className="bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs"
            />
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
              <ArrowRight className="w-3 h-3" />
              Changes here sync back into the builder.
            </div>
          </aside>
        )}
      </div>

      <Drawer
        direction="right"
        open={drawerOpen}
        onOpenChange={(open) => {
        setDrawerOpen(open)
        if (!open) {
          setEditingNode(null)
          setEditorError(null)
          setMediaUploadError(null)
          setUploadingMedia(null)
        }
      }}
      >
        <DrawerContent
          className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl"
        >
          <DrawerHeader className="border-b border-slate-800">
            <DrawerTitle className="text-white">Edit Node</DrawerTitle>
            <DrawerDescription className="text-slate-400">
              Update the title, type, and content for this node.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {!editingNode ? (
              <p className="text-sm text-slate-400">Select a node to edit.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Node Key</Label>
                    <Input value={editingNode.key} disabled className="bg-slate-800 border-slate-700 text-slate-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Title</Label>
                    <Input
                      value={editingNode.title}
                      onChange={(event) =>
                        updateEditingNode((node) => ({ ...node, title: event.target.value }))
                      }
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Type</Label>
                    <Select
                      value={editingNode.type}
                      onValueChange={(value) =>
                        updateEditingNode((node) => ({
                          ...node,
                          type: value as EditorNode["type"],
                          choices:
                            value === "DECISION" && node.choices.length === 0
                              ? [
                                  { id: "choice-1", text: "Choice 1", leads_to: "" },
                                  { id: "choice-2", text: "Choice 2", leads_to: "" },
                                ]
                              : node.choices,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        {nodeTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Text</Label>
                    <Textarea
                      value={editingNode.text}
                      onChange={(event) =>
                        updateEditingNode((node) => ({ ...node, text: event.target.value }))
                      }
                      rows={6}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="Write the story text here..."
                    />
                    <p className="text-xs text-slate-500">Separate paragraphs with a blank line.</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Visual prompt</Label>
                      <Input
                        value={editingNode.visual}
                        onChange={(event) =>
                          updateEditingNode((node) => ({ ...node, visual: event.target.value }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Image description or URL"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          ref={imageUploadRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            event.currentTarget.value = ""
                            if (!file) return
                            void handleUploadMedia(file, "image")
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-sky-500/60 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 hover:text-sky-100"
                          onClick={() => imageUploadRef.current?.click()}
                          disabled={uploadingMedia === "image"}
                        >
                          {uploadingMedia === "image" ? "Uploading..." : "Upload image"}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Audio</Label>
                      <Input
                        value={editingNode.audio}
                        onChange={(event) =>
                          updateEditingNode((node) => ({ ...node, audio: event.target.value }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Audio filename or URL"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          ref={audioUploadRef}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            event.currentTarget.value = ""
                            if (!file) return
                            void handleUploadMedia(file, "audio")
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-100"
                          onClick={() => audioUploadRef.current?.click()}
                          disabled={uploadingMedia === "audio"}
                        >
                          {uploadingMedia === "audio" ? "Uploading..." : "Upload audio"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {mediaUploadError && (
                    <div className="text-xs text-red-300 bg-red-900/20 border border-red-800 rounded-lg p-3">
                      {mediaUploadError}
                    </div>
                  )}

                  {editingNode.type === "DECISION" ? (
                    <div className="space-y-3">
                      <Label className="text-slate-300">Choices</Label>
                      {editingNode.choices.map((choice, index) => (
                        <div key={`${choice.id}-${index}`} className="space-y-2 rounded-lg border border-slate-800 p-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Choice {index + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-300 hover:text-red-200"
                              onClick={() => removeChoice(index)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                          <Input
                            value={choice.id}
                            onChange={(event) => handleChoiceChange(index, "id", event.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            placeholder="choice-1"
                          />
                          <Input
                            value={choice.text}
                            onChange={(event) => handleChoiceChange(index, "text", event.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            placeholder="Choice text"
                          />
                          <Input
                            value={choice.leads_to}
                            onChange={(event) => handleChoiceChange(index, "leads_to", event.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            placeholder="leads_to node key"
                          />
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed border-slate-700 text-slate-200"
                        onClick={addChoice}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Choice
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Next node key</Label>
                      <Input
                        value={editingNode.next}
                        onChange={(event) =>
                          updateEditingNode((node) => ({ ...node, next: event.target.value }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="next-node-key"
                      />
                    </div>
                  )}

                  {editorError && (
                    <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg p-3">
                      {editorError}
                    </div>
                  )}
                </div>

                <aside className="h-fit rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 space-y-3">
                  <div className="text-slate-200 font-semibold text-[11px] uppercase tracking-wide">Guide</div>
                  <p>Use media fields for optional visuals or audio cues (URLs or short prompts).</p>
                  <p>Narrative nodes should connect to one next node. Decisions need choices wired to targets.</p>
                  <p>Resolution nodes end the story with no outgoing transitions.</p>
                </aside>
              </div>
            )}
          </div>

          <DrawerFooter className="border-t border-slate-800">
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-red-500/60 text-red-200 bg-red-900/20 hover:bg-red-900/40"
              onClick={deleteEditingNode}
              disabled={!editingNode}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete node
            </Button>
            <Button
              onClick={handleSaveNode}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!editingNode}
            >
              Save changes
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
