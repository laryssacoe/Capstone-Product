"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import ReactFlow, {
  BaseEdge,
  Background,
  type Connection,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  type Node,
  type EdgeProps,
  type Edge,
  type NodeProps,
  getSmoothStepPath,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow"
import { Flag, GitBranch, ImageIcon, Plus, Trash2 } from "lucide-react"

import "reactflow/dist/style.css"

const flow_min_zoom = 0.35
const flow_max_zoom = 3

type StoryNodeType = "NARRATIVE" | "DECISION" | "RESOLUTION"

interface StoryChoice {
  id: string
  text?: string
  leads_to?: string
  effects?: {
    money?: number
    health?: number
    mentalHealth?: number
    support?: number
    time?: number
  }
}

interface StoryNode {
  key: string
  title?: string | null
  type?: StoryNodeType
  content?: {
    text?: string | string[]
    choices?: StoryChoice[]
    next?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface StoryPath {
  key: string
  label?: string
  summary?: string | null
  metadata?: unknown
}

interface StoryTransition {
  from: string
  to?: string | null
  path: string
  ordering?: number | null
  condition?: unknown
  effect?: unknown
}

interface StoryGraph {
  nodes: StoryNode[]
  paths: StoryPath[]
  transitions: StoryTransition[]
}

type FlowNodeData = {
  title: string
  type: StoryNodeType
  preview: string
}

interface EditorChoice {
  id: string
  text: string
  leads_to: string
  effects?: {
    money?: number
    health?: number
    mentalHealth?: number
    support?: number
    time?: number
  }
}

interface EditorNode {
  key: string
  title: string
  type: StoryNodeType
  text: string
  next: string
  choices: EditorChoice[]
  contentExtras: Record<string, unknown>
}

interface StoryFlowBuilderProps {
  graphJson: string
  onGraphJsonChange: (next: string) => void
  layout?: "full" | "canvas"
  showToolbar?: boolean
  showInspector?: boolean
  showControls?: boolean
  showMiniMap?: boolean
  onViewportControls?: (controls: {
    zoomIn: () => void
    zoomOut: () => void
    fitView: () => void
    getZoom: () => number
  }) => void
  layoutToken?: number
  onSelectionChange?: (key: string | null) => void
  onConnectionSelectionChange?: (connection: FlowConnectionSelection | null) => void
  onNodeEdit?: (key: string) => void
}

export interface FlowConnectionSelection {
  id: string
  from: string
  to: string
  path: string
  label?: string
}

const BuilderShell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  min-height: 520px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const FlowPanel = styled.div`
  background: radial-gradient(circle at top, rgba(30, 64, 175, 0.2), transparent 60%), rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  height: 100%;
`

const FlowToolbar = styled.div`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  background: rgba(15, 23, 42, 0.85);
`

const FlowToolbarLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ToolbarTitle = styled.div`
  font-size: 14px;
  color: rgb(226, 232, 240);
  font-weight: 600;
`

const ToolbarHint = styled.span`
  font-size: 11px;
  color: rgb(148, 163, 184);
  margin-left: 8px;
`

const FlowLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: rgb(203, 213, 225);
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const LegendDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 8px ${({ $color }) => $color};
`

const ToolbarActions = styled.div`
  display: flex;
  gap: 8px;
`

const ToolbarButton = styled.button<{ $variant?: "primary" | "danger" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 12px;
  cursor: pointer;
  color: white;
  background: ${({ $variant }) =>
    $variant === "danger" ? "rgba(127, 29, 29, 0.3)" : "rgba(59, 130, 246, 0.3)"};
  border-color: ${({ $variant }) =>
    $variant === "danger" ? "rgba(248, 113, 113, 0.4)" : "rgba(96, 165, 250, 0.4)"};
  transition: all 0.2s;

  &:hover {
    background: ${({ $variant }) =>
      $variant === "danger" ? "rgba(127, 29, 29, 0.5)" : "rgba(59, 130, 246, 0.45)"};
  }
`

const FlowCanvas = styled.div`
  flex: 1;
  height: 100%;
  min-height: 440px;
`

const InspectorPanel = styled.div`
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const InspectorTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  color: rgb(241, 245, 249);
`

const InspectorHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: rgb(148, 163, 184);
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 12px;
  color: rgb(203, 213, 225);
`

const TextInput = styled.input`
  background-color: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 8px;
  padding: 8px 10px;
  color: white;
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: rgba(96, 165, 250, 0.8);
  }
`

const SelectInput = styled.select`
  background-color: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 8px;
  padding: 8px 10px;
  color: white;
  font-size: 13px;
`

const TextArea = styled.textarea`
  background-color: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 8px;
  padding: 8px 10px;
  color: white;
  font-size: 13px;
  min-height: 120px;
  resize: vertical;
`

const ChoiceCard = styled.div`
  border: 1px solid rgba(51, 65, 85, 0.6);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(2, 6, 23, 0.35);
`

const ChoiceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ChoiceTitle = styled.span`
  font-size: 12px;
  color: rgb(226, 232, 240);
  font-weight: 600;
`

const ChoiceButton = styled.button`
  border: 1px solid rgba(248, 113, 113, 0.4);
  background: rgba(127, 29, 29, 0.3);
  color: rgb(252, 165, 165);
  border-radius: 6px;
  font-size: 11px;
  padding: 4px 6px;
  cursor: pointer;
`

const InlineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

const ApplyButton = styled.button`
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: rgba(16, 185, 129, 0.2);
  color: rgb(110, 231, 183);
  border: 1px solid rgba(16, 185, 129, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.32);
  }
`

const ErrorText = styled.div`
  font-size: 12px;
  color: rgb(252, 165, 165);
  background: rgba(127, 29, 29, 0.25);
  border: 1px solid rgba(127, 29, 29, 0.5);
  border-radius: 8px;
  padding: 8px 10px;
`

const EmptyState = styled.div`
  border: 1px dashed rgba(71, 85, 105, 0.6);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  color: rgb(148, 163, 184);
  font-size: 13px;
`

const NodeCard = styled.div<{ $selected: boolean; $accent: string }>`
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid ${({ $selected, $accent }) => ($selected ? $accent : "rgba(51, 65, 85, 0.9)")};
  border-radius: 10px;
  overflow: hidden;
  width: 200px;
  box-shadow: ${({ $selected, $accent }) =>
    $selected ? `0 0 0 1px ${$accent}, 0 10px 20px rgba(15, 23, 42, 0.6)` : "none"};
`

const NodeHeader = styled.div<{ $accent: string }>`
  background: linear-gradient(135deg, ${({ $accent }) => `${$accent}cc`}, rgba(15, 23, 42, 0.9));
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const NodeHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const NodeHeaderTitle = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.02em;
`

const NodeBody = styled.div`
  padding: 8px 10px;
`

const NodeTitle = styled.div`
  font-weight: 600;
  color: white;
  font-size: 12px;
`

const NodeMeta = styled.div`
  font-size: 10px;
  color: rgb(148, 163, 184);
  margin-top: 2px;
`

const NodePreview = styled.div`
  font-size: 10px;
  color: rgb(226, 232, 240);
  margin-top: 6px;
  line-height: 1.4;
  max-height: 34px;
  overflow: hidden;
`

const FlowHandle = styled(Handle)<{ $color: string }>`
  background: ${({ $color }) => $color};
  border: none;
  width: 12px;
  height: 12px;
`

const EdgeLabelBubble = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  transform: ${({ $x, $y }) => `translate(-50%, -50%) translate(${$x}px, ${$y}px)`};
  max-width: 240px;
  white-space: normal;
  line-height: 1.2;
  font-size: 10px;
  color: rgb(226, 232, 240);
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(139, 92, 246, 0.6);
  border-radius: 6px;
  padding: 4px 8px;
  text-align: center;
  overflow-wrap: anywhere;
`

const FlowBaseEdge = styled(BaseEdge).attrs<{ $edgeStyle?: React.CSSProperties }>(
  ({ $edgeStyle }) => ({
    style: $edgeStyle,
  }),
)``

const StyledMiniMap = styled(MiniMap)`
  background-color: rgba(15, 23, 42, 0.8);
`

function StoryNodeCard({ data, selected }: NodeProps<FlowNodeData>) {
  const accentByType: Record<StoryNodeType, string> = {
    NARRATIVE: "#38bdf8",
    DECISION: "#a855f7",
    RESOLUTION: "#f59e0b",
  }
  const iconByType: Record<StoryNodeType, typeof ImageIcon> = {
    NARRATIVE: ImageIcon,
    DECISION: GitBranch,
    RESOLUTION: Flag,
  }
  const accent = accentByType[data.type] ?? "#38bdf8"
  const Icon = iconByType[data.type] ?? ImageIcon

  return (
    <NodeCard $selected={selected} $accent={accent}>
      <FlowHandle
        type="target"
        position={Position.Left}
        $color="#38bdf8"
      />
      <FlowHandle
        type="source"
        position={Position.Right}
        $color="#a855f7"
      />
      <NodeHeader $accent={accent}>
        <NodeHeaderLeft>
          <Icon size={14} color="white" />
          <NodeHeaderTitle>{data.type}</NodeHeaderTitle>
        </NodeHeaderLeft>
      </NodeHeader>
      <NodeBody>
        <NodeTitle>{data.title}</NodeTitle>
        <NodeMeta>Drag to reposition · Click to edit</NodeMeta>
        {data.preview && <NodePreview>{data.preview}</NodePreview>}
      </NodeBody>
    </NodeCard>
  )
}

const nodeTypes = { story: StoryNodeCard }

type StoryEdgeData = {
  label?: string
}

function StoryEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  style,
}: EdgeProps<StoryEdgeData>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  const label = data?.label

  return (
    <>
      <FlowBaseEdge path={path} markerEnd={markerEnd} $edgeStyle={style} />
      {label ? (
        <EdgeLabelRenderer>
          <EdgeLabelBubble className="nodrag nopan" $x={labelX} $y={labelY}>
            {label}
          </EdgeLabelBubble>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

const edgeTypes = { story: StoryEdge }

function FlowViewportBridge({
  onReady,
}: {
  onReady?: (controls: {
    zoomIn: () => void
    zoomOut: () => void
    fitView: () => void
    getZoom: () => number
  }) => void
}) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow()

  useEffect(() => {
    if (!onReady) return
    onReady({ zoomIn, zoomOut, fitView: () => fitView({ padding: 0.35 }), getZoom })
  }, [onReady, zoomIn, zoomOut, fitView, getZoom])

  return null
}

const buildFlowNodes = (
  graph: StoryGraph,
  positionOverrides?: Map<string, { x: number; y: number }>,
  spacing = { x: 320, y: 220 },
) => {
  // Use previous positions when available; otherwise place nodes on a simple grid
  return graph.nodes.map((node, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const fallbackPosition = { x: col * spacing.x, y: row * spacing.y }
    return {
      id: node.key,
      type: "story",
      position: positionOverrides?.get(node.key) ?? fallbackPosition,
      data: {
        title: node.title || node.key,
        type: (node.type ?? "NARRATIVE") as StoryNodeType,
        preview: buildPreview(node.content?.text),
      },
    }
  })
}

const parseGraph = (raw: string): StoryGraph | null => {
  try {
    const parsed = JSON.parse(raw)
    // Return early unless the editor can trust the expected graph structure
    if (!parsed || typeof parsed !== "object") return null
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.paths) || !Array.isArray(parsed.transitions)) {
      return null
    }
    return parsed as StoryGraph
  } catch {
    return null
  }
}

const toTextValue = (text?: string | string[]) => {
  if (Array.isArray(text)) return text.join("\n\n")
  return text ?? ""
}

const buildPreview = (text?: string | string[]) => {
  const value = toTextValue(text).trim()
  if (!value) return ""
  return value.length > 120 ? `${value.slice(0, 120)}...` : value
}

const ensureUniqueKey = (nodes: StoryNode[], prefix: string) => {
  const existing = new Set(nodes.map((node) => node.key))
  let index = nodes.length + 1
  let key = `${prefix}-${index}`
  while (existing.has(key)) {
    index += 1
    key = `${prefix}-${index}`
  }
  return key
}

const syncNodeTransitions = (graph: StoryGraph, node: StoryNode): StoryGraph => {
  const content = node.content ?? {}
  const choices = Array.isArray(content.choices) ? content.choices : []
  const next = typeof content.next === "string" ? content.next : ""

  // Rebuild only this node's outgoing edges from content.next / content.choices
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

  choices.forEach((choice, index) => {
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

  return { ...graph, paths: Array.from(pathMap.values()), transitions }
}

const ensureUniqueChoiceId = (paths: StoryPath[], choices: StoryChoice[], base: string) => {
  const existing = new Set([
    ...paths.map((path) => path.key),
    ...choices.map((choice) => choice.id).filter(Boolean),
  ])
  let key = base
  let index = 1
  while (existing.has(key)) {
    index += 1
    key = `${base}-${index}`
  }
  return key
}

const buildGraphWithConnection = (graph: StoryGraph, source: string, target: string): StoryGraph => {
  const sourceNode = graph.nodes.find((node) => node.key === source)
  if (!sourceNode) return graph

  const hasExisting = graph.transitions.some(
    (transition) => transition.from === source && transition.to === target,
  )
  if (hasExisting) return graph

  const nextGraph: StoryGraph = {
    ...graph,
    nodes: graph.nodes.map((node) => ({ ...node })),
    paths: graph.paths.map((path) => ({ ...path })),
    transitions: graph.transitions.map((transition) => ({ ...transition })),
  }

  const nodeIndex = nextGraph.nodes.findIndex((node) => node.key === source)
  const node = nextGraph.nodes[nodeIndex]
  const content = { ...(node.content ?? {}) }
  const choices = Array.isArray(content.choices) ? [...content.choices] : []

  if (node.type === "DECISION") {
    // Decision nodes get a dedicated choice + path for each new connection
    const baseId = `choice-${choices.length + 1}`
    const choiceId = ensureUniqueChoiceId(nextGraph.paths, choices, baseId)
    const choiceLabel = `Choice ${choices.length + 1}`

    choices.push({
      id: choiceId,
      text: choiceLabel,
      leads_to: target,
    })

    content.choices = choices
    delete content.next

    nextGraph.transitions = nextGraph.transitions.filter(
      (transition) => !(transition.from === source && transition.path === "continue"),
    )

    nextGraph.paths.push({ key: choiceId, label: choiceLabel })
    nextGraph.transitions.push({
      from: source,
      to: target,
      path: choiceId,
      ordering: choices.length - 1,
    })
  } else {
    // Narrative/resolution-like nodes map a single outgoing link to "continue"
    content.next = target
    delete content.choices

    if (!nextGraph.paths.some((path) => path.key === "continue")) {
      nextGraph.paths.push({ key: "continue", label: "Continue" })
    }

    nextGraph.transitions = nextGraph.transitions.filter(
      (transition) => !(transition.from === source && transition.path === "continue"),
    )
    nextGraph.transitions.push({
      from: source,
      to: target,
      path: "continue",
      ordering: 0,
    })
  }

  nextGraph.nodes[nodeIndex] = { ...node, content }
  return nextGraph
}

const removeTransitionsForEdges = (graph: StoryGraph, edgesToRemove: Edge[]): StoryGraph => {
  // Match ReactFlow edges back to graph transitions using a stable composite key
  const edgeKeys = new Set(
    edgesToRemove
      .map((edge) => {
        const data = edge.data as { from?: string; to?: string; path?: string } | undefined
        if (data?.from && data?.to && data?.path) {
          return `${data.from}::${data.path}::${data.to}`
        }
        if (edge.source && edge.target && edge.label) {
          return `${edge.source}::${String(edge.label)}::${edge.target}`
        }
        return ""
      })
      .filter(Boolean),
  )

  if (edgeKeys.size === 0) return graph

  const nextGraph: StoryGraph = {
    ...graph,
    nodes: graph.nodes.map((node) => ({ ...node })),
    transitions: graph.transitions.filter((transition) => {
      const key = `${transition.from}::${transition.path}::${transition.to ?? ""}`
      return !edgeKeys.has(key)
    }),
  }

  nextGraph.nodes = nextGraph.nodes.map((node) => {
    const content = { ...(node.content ?? {}) }
    if (typeof content.next === "string") {
      const key = `${node.key}::continue::${content.next}`
      if (edgeKeys.has(key)) {
        delete content.next
      }
    }
    if (Array.isArray(content.choices)) {
      content.choices = content.choices.filter((choice) => {
        const key = `${node.key}::${choice.id}::${choice.leads_to ?? ""}`
        return !edgeKeys.has(key)
      })
    }
    return { ...node, content }
  })

  return nextGraph
}

export default function StoryFlowBuilder({
  graphJson,
  onGraphJsonChange,
  layout = "full",
  showToolbar = true,
  showInspector = true,
  showControls = true,
  showMiniMap = true,
  onViewportControls,
  layoutToken,
  onSelectionChange,
  onConnectionSelectionChange,
  onNodeEdit,
}: StoryFlowBuilderProps) {
  const graph = useMemo(() => parseGraph(graphJson), [graphJson])
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editorNode, setEditorNode] = useState<EditorNode | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)

  useEffect(() => {
    if (!graph) {
      setNodes([])
      setEdges([])
      return
    }

    // Keep manual node positions stable when graph content changes
    setNodes((previous) => {
      const previousPositions = new Map(previous.map((node) => [node.id, node.position]))
      return buildFlowNodes(graph, previousPositions)
    })
  }, [graph, setNodes, setEdges])

  useEffect(() => {
    if (!graph || layoutToken == null) return
    // Explicit auto-layout trigger from parent (e.g. "Reset view"/auto arrange)
    const total = graph.nodes.length
    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(total))))
    const spacing = { x: 380, y: 280 }
    const positions = new Map<string, { x: number; y: number }>()
    graph.nodes.forEach((node, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      positions.set(node.key, { x: col * spacing.x, y: row * spacing.y })
    })
    setNodes(buildFlowNodes(graph, positions, spacing))
  }, [graph, layoutToken, setNodes])

  useEffect(() => {
    if (!graph) return
    const pathLabelByKey = new Map(graph.paths.map((path) => [path.key, path.label || path.key]))
    const nodeKeys = new Set(graph.nodes.map((node) => node.key))

    // Project graph transitions into renderable ReactFlow edges
    const nextEdges: Edge[] = graph.transitions
      .filter((transition) => transition.to && nodeKeys.has(transition.from) && nodeKeys.has(transition.to))
      .map((transition, index) => {
        const labelText = pathLabelByKey.get(transition.path) || transition.path
        const isContinue = transition.path === "continue" || labelText.toLowerCase() === "continue"

        return {
          id: `edge-${transition.from}-${transition.path}-${transition.to}-${index}`,
          source: transition.from,
          target: transition.to as string,
          type: "story",
          data: { from: transition.from, to: transition.to, path: transition.path, label: labelText },
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: "rgba(139, 92, 246, 0.9)",
            strokeWidth: 2,
            strokeDasharray: isContinue ? "0" : "6 4",
          },
        }
      })

    setEdges(nextEdges)
  }, [graph, setEdges])

  useEffect(() => {
    if (!graph || !selectedNodeId) {
      setEditorNode(null)
      return
    }

    const selected = graph.nodes.find((node) => node.key === selectedNodeId)
    if (!selected) {
      setEditorNode(null)
      return
    }

    const content = selected.content ?? {}
    const { text, choices, next, ...contentExtras } = content
    const normalizedChoices = Array.isArray(choices)
      ? choices.map((choice, index) => ({
          id: choice.id || `choice-${index + 1}`,
          text: choice.text || choice.id || `Choice ${index + 1}`,
          leads_to: choice.leads_to || "",
          effects: choice.effects,
        }))
      : []

    setEditorNode({
      key: selected.key,
      title: selected.title || selected.key,
      type: selected.type ?? "NARRATIVE",
      text: toTextValue(text),
      next: typeof next === "string" ? next : "",
      choices: normalizedChoices,
      contentExtras: { ...contentExtras },
    })
  }, [graph, selectedNodeId])

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNodeId(node.id)
    setEditorError(null)
    onSelectionChange?.(node.id)
    onConnectionSelectionChange?.(null)
    onNodeEdit?.(node.id)
  }, [onConnectionSelectionChange, onSelectionChange, onNodeEdit])

  const handleEdgeClick = useCallback((_: unknown, edge: Edge) => {
    const data = (edge.data ?? {}) as { from?: string; to?: string; path?: string; label?: string }
    if (!data.from || !data.to || !data.path) {
      onConnectionSelectionChange?.(null)
      return
    }
    setSelectedNodeId(null)
    setEditorNode(null)
    setEditorError(null)
    onSelectionChange?.(null)
    onConnectionSelectionChange?.({
      id: edge.id,
      from: data.from,
      to: data.to,
      path: data.path,
      label: data.label,
    })
  }, [onConnectionSelectionChange, onSelectionChange])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setEditorNode(null)
    setEditorError(null)
    onSelectionChange?.(null)
    onConnectionSelectionChange?.(null)
  }, [onConnectionSelectionChange, onSelectionChange])

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!graph || !connection.source || !connection.target) return
      if (connection.source === connection.target) return
      // New visual connection mutates graph semantics immediately
      const nextGraph = buildGraphWithConnection(graph, connection.source, connection.target)
      onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
    },
    [graph, onGraphJsonChange],
  )

  const handleEdgesDelete = useCallback(
    (edgesToRemove: Edge[]) => {
      if (!graph || edgesToRemove.length === 0) return
      const nextGraph = removeTransitionsForEdges(graph, edgesToRemove)
      onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
      onConnectionSelectionChange?.(null)
    },
    [graph, onConnectionSelectionChange, onGraphJsonChange],
  )

  const handleAddNode = useCallback(() => {
    if (!graph) return
    const key = ensureUniqueKey(graph.nodes, "node")
    const nextGraph: StoryGraph = {
      ...graph,
      nodes: [
        ...graph.nodes,
        {
          key,
          title: "New Node",
          type: "NARRATIVE",
          content: { text: "Write this passage..." },
        },
      ],
    }
    onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
    setSelectedNodeId(key)
  }, [graph, onGraphJsonChange])

  const handleDeleteNode = useCallback(() => {
    if (!graph || !editorNode) return
    const nextGraph: StoryGraph = {
      ...graph,
      nodes: graph.nodes.filter((node) => node.key !== editorNode.key),
      transitions: graph.transitions.filter(
        (transition) => transition.from !== editorNode.key && transition.to !== editorNode.key,
      ),
    }
    onGraphJsonChange(JSON.stringify(nextGraph, null, 2))
    setSelectedNodeId(null)
    setEditorNode(null)
    onSelectionChange?.(null)
    onConnectionSelectionChange?.(null)
  }, [graph, editorNode, onConnectionSelectionChange, onGraphJsonChange, onSelectionChange])

  const handleChoiceUpdate = useCallback(
    (index: number, field: keyof EditorChoice, value: string) => {
      setEditorNode((previous) => {
        if (!previous) return previous
        const updated = [...previous.choices]
        const choice = { ...updated[index], [field]: value }
        updated[index] = choice
        return { ...previous, choices: updated }
      })
    },
    [],
  )

  const handleChoiceEffectUpdate = useCallback(
    (index: number, field: keyof NonNullable<EditorChoice["effects"]>, value: string) => {
      setEditorNode((previous) => {
        if (!previous) return previous
        const updated = [...previous.choices]
        const choice = { ...updated[index] }
        const numericValue = value === "" ? undefined : Number(value)
        const effects = { ...(choice.effects ?? {}) }
        if (numericValue == null || Number.isNaN(numericValue)) {
          delete effects[field]
        } else {
          effects[field] = numericValue
        }
        choice.effects = Object.keys(effects).length ? effects : undefined
        updated[index] = choice
        return { ...previous, choices: updated }
      })
    },
    [],
  )

  const handleAddChoice = useCallback(() => {
    setEditorNode((previous) => {
      if (!previous) return previous
      const nextIndex = previous.choices.length + 1
      return {
        ...previous,
        choices: [
          ...previous.choices,
          {
            id: `choice-${nextIndex}`,
            text: `Choice ${nextIndex}`,
            leads_to: "",
          },
        ],
      }
    })
  }, [])

  const handleRemoveChoice = useCallback((index: number) => {
    setEditorNode((previous) => {
      if (!previous) return previous
      const updated = previous.choices.filter((_, idx) => idx !== index)
      return { ...previous, choices: updated }
    })
  }, [])

  const handleApplyChanges = useCallback(() => {
    if (!graph || !editorNode) return
    const trimmedText = editorNode.text.trim()
    if (!trimmedText) {
      setEditorError("Add at least one paragraph before applying changes.")
      return
    }
    if (
      editorNode.choices.some(
        (choice) => !choice.id.trim() || (editorNode.type === "DECISION" && !choice.leads_to.trim()),
      )
    ) {
      setEditorError("Each choice needs an id and a leads_to target.")
      return
    }

    const original = graph.nodes.find((node) => node.key === editorNode.key)
    if (!original) return

    // Persist editor fields back into the graph, then regenerate outgoing links
    const updatedContent = {
      ...editorNode.contentExtras,
      text: trimmedText,
      next: editorNode.next.trim() || undefined,
      choices:
        editorNode.choices.length > 0
          ? editorNode.choices.map((choice) => ({
              id: choice.id.trim(),
              text: choice.text.trim() || choice.id.trim(),
              leads_to: choice.leads_to.trim() || undefined,
              effects: choice.effects,
            }))
          : undefined,
    }

    const updatedNode: StoryNode = {
      ...original,
      title: editorNode.title.trim() || original.title || editorNode.key,
      type: editorNode.type,
      content: updatedContent,
    }

    const updatedNodes = graph.nodes.map((node) => (node.key === editorNode.key ? updatedNode : node))
    const withTransitions = syncNodeTransitions({ ...graph, nodes: updatedNodes }, updatedNode)
    onGraphJsonChange(JSON.stringify(withTransitions, null, 2))
    setEditorError(null)
  }, [graph, editorNode, onGraphJsonChange])

  if (!graph) {
    return (
      <BuilderShell>
        <FlowPanel>
          {showToolbar && (
            <FlowToolbar>
              <ToolbarTitle>Story Flow Builder</ToolbarTitle>
            </FlowToolbar>
          )}
          <EmptyState>Graph JSON is invalid. Switch to JSON mode to fix it, then return here.</EmptyState>
        </FlowPanel>
        {showInspector && (
          <InspectorPanel>
            <InspectorTitle>Node Inspector</InspectorTitle>
            <InspectorHint>Select a node once the graph is valid.</InspectorHint>
          </InspectorPanel>
        )}
      </BuilderShell>
    )
  }

  const flowPanel = (
    <FlowPanel>
      {showToolbar && (
        <FlowToolbar>
          <FlowToolbarLeft>
            <ToolbarTitle>Story Flow Builder</ToolbarTitle>
            <ToolbarHint>Draft: node positions are not saved yet.</ToolbarHint>
            <FlowLegend>
              <LegendItem>
                <LegendDot $color="#a855f7" /> Drag from purple handle
              </LegendItem>
              <LegendItem>
                <LegendDot $color="#38bdf8" /> Drop on blue handle
              </LegendItem>
              <LegendItem>Decision nodes add choices · Narrative nodes set Continue</LegendItem>
            </FlowLegend>
          </FlowToolbarLeft>
          <ToolbarActions>
            <ToolbarButton type="button" onClick={handleAddNode}>
              <Plus size={14} /> Add Node
            </ToolbarButton>
            <ToolbarButton type="button" $variant="danger" onClick={handleDeleteNode} disabled={!editorNode}>
              <Trash2 size={14} /> Delete
            </ToolbarButton>
          </ToolbarActions>
        </FlowToolbar>
      )}
      <FlowCanvas>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onConnect={handleConnect}
          onEdgesDelete={handleEdgesDelete}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          edgesUpdatable={false}
          fitView
          fitViewOptions={{ padding: 0.35 }}
          minZoom={flow_min_zoom}
          maxZoom={flow_max_zoom}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="rgba(71, 85, 105, 0.35)" />
          <FlowViewportBridge onReady={onViewportControls} />
          {showMiniMap && (
            <StyledMiniMap
              nodeColor={() => "rgba(59, 130, 246, 0.8)"}
              maskColor="rgba(15, 23, 42, 0.65)"
            />
          )}
          {showControls && <Controls />}
        </ReactFlow>
      </FlowCanvas>
    </FlowPanel>
  )

  if (layout === "canvas" || !showInspector) {
    return flowPanel
  }

  return (
    <BuilderShell>
      {flowPanel}
      <InspectorPanel>
        <InspectorTitle>Node Inspector</InspectorTitle>
        {!editorNode ? (
          <EmptyState>Select a node in the flow to edit details.</EmptyState>
        ) : (
          <>
            <FormGroup>
              <Label>Key (read-only)</Label>
              <TextInput value={editorNode.key} disabled />
            </FormGroup>
            <FormGroup>
              <Label>Title</Label>
              <TextInput
                value={editorNode.title}
                onChange={(event) =>
                  setEditorNode((previous) => (previous ? { ...previous, title: event.target.value } : previous))
                }
              />
            </FormGroup>
            <FormGroup>
              <Label>Type</Label>
              <SelectInput
                value={editorNode.type}
                onChange={(event) =>
                  setEditorNode((previous) =>
                    previous ? { ...previous, type: event.target.value as StoryNodeType } : previous,
                  )
                }
              >
                <option value="NARRATIVE">Narrative</option>
                <option value="DECISION">Decision</option>
                <option value="RESOLUTION">Resolution</option>
              </SelectInput>
            </FormGroup>
            <FormGroup>
              <Label>Text</Label>
              <TextArea
                value={editorNode.text}
                onChange={(event) =>
                  setEditorNode((previous) => (previous ? { ...previous, text: event.target.value } : previous))
                }
              />
            </FormGroup>
            {editorNode.type === "DECISION" ? (
              <FormGroup>
                <Label>Choices</Label>
                {editorNode.choices.length === 0 && <InspectorHint>No choices yet.</InspectorHint>}
                {editorNode.choices.map((choice, index) => (
                  <ChoiceCard key={`${choice.id}-${index}`}>
                    <ChoiceHeader>
                      <ChoiceTitle>Choice {index + 1}</ChoiceTitle>
                      <ChoiceButton type="button" onClick={() => handleRemoveChoice(index)}>
                        Remove
                      </ChoiceButton>
                    </ChoiceHeader>
                    <TextInput
                      value={choice.id}
                      onChange={(event) => handleChoiceUpdate(index, "id", event.target.value)}
                      placeholder="choice-id"
                    />
                    <TextInput
                      value={choice.text}
                      onChange={(event) => handleChoiceUpdate(index, "text", event.target.value)}
                      placeholder="Choice text"
                    />
                    <TextInput
                      value={choice.leads_to}
                      onChange={(event) => handleChoiceUpdate(index, "leads_to", event.target.value)}
                      placeholder="leads_to node key"
                    />
                    <InlineGrid>
                      <TextInput
                        type="number"
                        value={choice.effects?.money ?? ""}
                        onChange={(event) => handleChoiceEffectUpdate(index, "money", event.target.value)}
                        placeholder="money"
                      />
                      <TextInput
                        type="number"
                        value={choice.effects?.health ?? ""}
                        onChange={(event) => handleChoiceEffectUpdate(index, "health", event.target.value)}
                        placeholder="health"
                      />
                      <TextInput
                        type="number"
                        value={choice.effects?.mentalHealth ?? ""}
                        onChange={(event) => handleChoiceEffectUpdate(index, "mentalHealth", event.target.value)}
                        placeholder="mentalHealth"
                      />
                      <TextInput
                        type="number"
                        value={choice.effects?.support ?? ""}
                        onChange={(event) => handleChoiceEffectUpdate(index, "support", event.target.value)}
                        placeholder="support"
                      />
                      <TextInput
                        type="number"
                        value={choice.effects?.time ?? ""}
                        onChange={(event) => handleChoiceEffectUpdate(index, "time", event.target.value)}
                        placeholder="time"
                      />
                    </InlineGrid>
                  </ChoiceCard>
                ))}
                <ToolbarButton type="button" onClick={handleAddChoice}>
                  <Plus size={14} /> Add Choice
                </ToolbarButton>
              </FormGroup>
            ) : (
              <FormGroup>
                <Label>Next node key</Label>
                <TextInput
                  value={editorNode.next}
                  onChange={(event) =>
                    setEditorNode((previous) => (previous ? { ...previous, next: event.target.value } : previous))
                  }
                  placeholder="next-node-key"
                />
              </FormGroup>
            )}
            {editorError && <ErrorText>{editorError}</ErrorText>}
            <ApplyButton type="button" onClick={handleApplyChanges}>
              Apply changes to JSON
            </ApplyButton>
          </>
        )}
      </InspectorPanel>
    </BuilderShell>
  )
}
