"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AppHeader from "@/components/app-header"
import { BookOpen, ClipboardCheck, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface CreatorStoryNode {
  key: string
  title?: string | null
  synopsis?: string | null
  type?: string
  content?: unknown
  media?: unknown
}

interface CreatorStoryPath {
  key: string
  label: string
  summary?: string | null
  metadata?: unknown
}

interface CreatorStoryTransition {
  from: string
  to?: string | null
  path: string
  ordering?: number | null
  condition?: unknown
  effect?: unknown
}

interface CreatorStory {
  id: string
  slug: string
  title: string
  summary?: string | null
  tags: string[]
  visibility: string
  reviewStatus?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED"
  createdAt: string
  updatedAt: string
  nodes: CreatorStoryNode[]
  paths: CreatorStoryPath[]
  transitions: CreatorStoryTransition[]
}

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
}

function validateGraph(graph: any): { ok: true } | { ok: false; message: string } {
  if (!graph || typeof graph !== "object") return { ok: false, message: "Graph is missing." }
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0)
    return { ok: false, message: "Graph must include at least one node." }
  if (!Array.isArray(graph.paths) || graph.paths.length === 0)
    return { ok: false, message: "Graph must include at least one path." }
  if (!Array.isArray(graph.transitions) || graph.transitions.length === 0)
    return { ok: false, message: "Graph must include at least one transition." }

  const nodeKeys = new Set<string>()
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i]
    if (!node || typeof node !== "object") return { ok: false, message: `Node ${i + 1} is not an object.` }
    if (!node.key || typeof node.key !== "string" || !node.key.trim())
      return { ok: false, message: `Node ${i + 1} is missing a valid 'key'.` }
    nodeKeys.add(node.key)
  }

  const pathKeys = new Set<string>()
  for (let i = 0; i < graph.paths.length; i++) {
    const path = graph.paths[i]
    if (!path || typeof path !== "object") return { ok: false, message: `Path ${i + 1} is not an object.` }
    if (!path.key || typeof path.key !== "string" || !path.key.trim())
      return { ok: false, message: `Path ${i + 1} is missing a valid 'key'.` }
    if (!path.label || typeof path.label !== "string" || !path.label.trim())
      return { ok: false, message: `Path ${i + 1} is missing a valid 'label'.` }
    pathKeys.add(path.key)
  }

  for (let i = 0; i < graph.transitions.length; i++) {
    const transition = graph.transitions[i]
    if (!transition || typeof transition !== "object")
      return { ok: false, message: `Transition ${i + 1} is not an object.` }
    if (!transition.from || typeof transition.from !== "string" || !transition.from.trim())
      return { ok: false, message: `Transition ${i + 1} is missing 'from'.` }
    if (!transition.path || typeof transition.path !== "string" || !transition.path.trim())
      return { ok: false, message: `Transition ${i + 1} is missing 'path'.` }
    if (!nodeKeys.has(transition.from))
      return { ok: false, message: `Transition ${i + 1}: 'from' references unknown node '${transition.from}'.` }
    if (!pathKeys.has(transition.path))
      return { ok: false, message: `Transition ${i + 1}: 'path' references unknown path '${transition.path}'.` }
    if (transition.to != null && typeof transition.to === "string" && !nodeKeys.has(transition.to)) {
      return { ok: false, message: `Transition ${i + 1}: 'to' references unknown node '${transition.to}'.` }
    }
  }

  return { ok: true }
}

const jsonTemplate = JSON.stringify(
  {
    nodes: [
      {
        key: "start",
        title: "Introduction",
        type: "NARRATIVE",
        content: {
          text: ["Opening passage text goes here."],
          next: "decision-1",
        },
        media: {
          visual: "Visual prompt",
          audio: "Ambient audio notes",
        },
      },
      {
        key: "decision-1",
        title: "Decision Point",
        type: "DECISION",
        content: {
          text: ["Describe the situation the learner must respond to."],
          choices: [
            { id: "a", text: "Choice A", leads_to: "outcome-a" },
            { id: "b", text: "Choice B", leads_to: "outcome-b" },
          ],
        },
      },
      {
        key: "outcome-a",
        title: "Outcome A",
        type: "RESOLUTION",
        content: {
          text: ["Describe what happens after choosing option A."],
        },
      },
      {
        key: "outcome-b",
        title: "Outcome B",
        type: "RESOLUTION",
        content: {
          text: ["Describe what happens after choosing option B."],
        },
      },
    ],
    paths: [
      { key: "start__auto__decision-1", label: "Continue" },
      { key: "choice-a", label: "Choice A" },
      { key: "choice-b", label: "Choice B" },
    ],
    transitions: [
      { from: "start", to: "decision-1", path: "start__auto__decision-1" },
      { from: "decision-1", to: "outcome-a", path: "choice-a", ordering: 0 },
      { from: "decision-1", to: "outcome-b", path: "choice-b", ordering: 1 },
    ],
  },
  null,
  2,
)

const parseTagsString = (input: string) =>
  input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

const authorChecklistSections = [
  {
    title: "Configure Twison export",
    items: [
      "In Twine: Formats → Add a New Format → paste https://cdn.jsdelivr.net/gh/joshglover/twison@master/twison.js.",
      "Activate Twison per story via Story → Change Story Format → Twison.",
      "Optional: Import the Loop template.twee for ready-made metadata blocks.",
    ],
  },
  {
    title: "Structure essentials",
    items: [
      "Name every passage uniquely; these names become node keys in Loop.",
      "Set the correct start passage in Twine so the entry node matches your onboarding.",
      "Write choices with Twine links like [[Talk to nurse->triage]] so the importer sees labels and targets.",
      "Add optional tags such as [emotion=hope, audio=intro.mp3] to enrich node metadata.",
    ],
  },
  {
    title: "Before import",
    items: [
      "Publish to File while Twison is active to produce a .json export (Loop now also accepts Twine HTML).",
      "Zip the export only if bundling multiple files; include just JSON/HTML to keep uploads clean.",
  "Check that your story code or title is unique, or plan overrides in the import form / CLI flags.",
    ],
  },
] as const

export default function CreatorDashboard() {
  // ...existing code...
  const { toast } = useToast()
  const { user, loading, refresh } = useAuth()
  const router = useRouter()

  const [stories, setStories] = useState<CreatorStory[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [storiesMessage, setStoriesMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("New Story Title")
  const [summary, setSummary] = useState("Short description of this journey.")
  const [tags, setTags] = useState("community, empathy")
  const [visibility, setVisibility] = useState<"PRIVATE" | "UNLISTED" | "PUBLIC">("PRIVATE")
  const [graphJson, setGraphJson] = useState(jsonTemplate)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ slug: string | null; action: 'delete' | null }>({ slug: null, action: null })
  const [activeTab, setActiveTab] = useState("stories")
  const [checklistState, setChecklistState] = useState<boolean[][]>(() =>
    authorChecklistSections.map((section) => section.items.map(() => false)),
  )

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSlug, setImportSlug] = useState("")
  const [importTitle, setImportTitle] = useState("")
  const [importSummary, setImportSummary] = useState("")
  const [importTags, setImportTags] = useState("")
  const [importVisibility, setImportVisibility] = useState<"PRIVATE" | "UNLISTED" | "PUBLIC">("PRIVATE")
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const storiesErrorRef = useRef<HTMLParagraphElement | null>(null)
  const formErrorRef = useRef<HTMLParagraphElement | null>(null)
  const publishErrorRef = useRef<HTMLParagraphElement | null>(null)
  const importErrorRef = useRef<HTMLParagraphElement | null>(null)

  const scrollErrorIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) return
    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      element.focus({ preventScroll: true })
    })
  }, [])

  const isCreator = user?.role === "CREATOR" || user?.role === "ADMIN"
  const canSubmitStories = user?.permissions?.canSubmitStories ?? false
  const creatorStatus = user?.creatorProfile?.status ?? null

  const [ownershipModalOpen, setOwnershipModalOpen] = useState(false)
  const [pendingPublishType, setPendingPublishType] = useState<"NEW" | "EXISTING" | null>(null)
  const [pendingStory, setPendingStory] = useState<CreatorStory | null>(null)
  const [ownershipAck, setOwnershipAck] = useState({ transfer: false, contact: false })
  const [ownershipConfirmLoading, setOwnershipConfirmLoading] = useState(false)

  const resetStoryFormToNew = useCallback(() => {
    setEditingStoryId(null)
    setSlug("")
    setTitle("New Story Title")
    setSummary("Short description of this journey.")
    setTags("community, empathy")
    setGraphJson(jsonTemplate)
    setFormError(null)
    setPublishError(null)
    setPublishSuccess(null)
  }, [])

  const handleChecklistToggle = useCallback((sectionIndex: number, itemIndex: number, next: boolean) => {
    setChecklistState((previous) =>
      previous.map((section, sIdx) =>
        sIdx === sectionIndex ? section.map((checked, itemIdx) => (itemIdx === itemIndex ? next : checked)) : section,
      ),
    )
  }, [])

  const resetOwnershipModal = useCallback(() => {
    setOwnershipAck({ transfer: false, contact: false })
    setPendingPublishType(null)
    setPendingStory(null)
  }, [])

  const resetChecklist = useCallback(() => {
    setChecklistState(authorChecklistSections.map((section) => section.items.map(() => false)))
  }, [])

  const normalizedStoryCode = useMemo(() => normalizeSlug(slug), [slug])
  const conflictingStoryForCode = useMemo(() => {
    if (!normalizedStoryCode) return null
    return stories.find((story) => story.slug === normalizedStoryCode && story.id !== editingStoryId) ?? null
  }, [stories, normalizedStoryCode, editingStoryId])
  const storyCodeConflictMessage = conflictingStoryForCode
    ? `Story code already belongs to "${conflictingStoryForCode.title}". Please choose a different code.`
    : null
  const hasStoryCodeConflict = Boolean(storyCodeConflictMessage)

  const fetchStoriesFromApi = useCallback(async (): Promise<CreatorStory[]> => {
    const response = await fetch("/api/creator/stories", {
      cache: "no-store",
      credentials: "include",
    })

    let data: any = null
    try {
      data = await response.json()
    } catch (error) {
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }
      console.warn("[creator-dashboard] Stories endpoint returned no JSON payload.")
      return []
    }

    if (!response.ok) {
      const message = data?.error ?? `Request failed (${response.status})`
      throw new Error(message)
    }

    if (!Array.isArray(data?.stories)) {
      return []
    }

    return data.stories as CreatorStory[]
  }, [])

  const refreshStories = useCallback(async () => {
    try {
      const latest = await fetchStoriesFromApi()
      setStories(latest)
      setFetchError(null)
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unable to load stories.")
      throw error
    }
  }, [fetchStoriesFromApi])

  useEffect(() => {
    if (!isCreator) return
    let cancelled = false
    setFetchError(null)
    setStoriesMessage(null)
    ;(async () => {
      try {
        const data = await fetchStoriesFromApi()
        if (!cancelled) {
          setStories(data)
        }
      } catch (error) {
        if (!cancelled) {
          setFetchError(error instanceof Error ? error.message : "Unable to load stories.")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fetchStoriesFromApi, isCreator])

  useEffect(() => {
    if (!storiesMessage) return
    const stickyMessages = new Set([
      "Complete your creator profile before submitting stories for approval.",
    ])
    if (stickyMessages.has(storiesMessage)) {
      return
    }
    const timeout = setTimeout(() => setStoriesMessage(null), 6000)
    return () => clearTimeout(timeout)
  }, [storiesMessage])

  useEffect(() => {
    if (!publishSuccess) return
    const timeout = setTimeout(() => setPublishSuccess(null), 6000)
    return () => clearTimeout(timeout)
  }, [publishSuccess])

  useEffect(() => {
    if (!importSuccess) return
    const timeout = setTimeout(() => setImportSuccess(null), 6000)
    return () => clearTimeout(timeout)
  }, [importSuccess])

  useEffect(() => {
    if (fetchError) {
      scrollErrorIntoView(storiesErrorRef.current)
    }
  }, [fetchError, scrollErrorIntoView])

  useEffect(() => {
    if (formError) {
      scrollErrorIntoView(formErrorRef.current)
    }
  }, [formError, scrollErrorIntoView])

  useEffect(() => {
    if (publishError) {
      scrollErrorIntoView(publishErrorRef.current)
    }
  }, [publishError, scrollErrorIntoView])

  useEffect(() => {
    if (importError) {
      scrollErrorIntoView(importErrorRef.current)
    }
  }, [importError, scrollErrorIntoView])

  const populateFormFromStory = (story: CreatorStory) => {
    setSlug(story.slug)
    setTitle(story.title)
    setSummary(story.summary ?? "")
    setTags(story.tags.join(", "))
    setVisibility((story.visibility as "PRIVATE" | "UNLISTED" | "PUBLIC") ?? "PRIVATE")
    setGraphJson(
      JSON.stringify(
        {
          nodes: story.nodes,
          paths: story.paths,
          transitions: story.transitions,
        },
        null,
        2,
      ),
    )
    setFormError(null)
    setPublishError(null)
    setPublishSuccess(null)
  }

  const handleCreateStory = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setStoriesMessage(null)
    setCreating(true)
    try {
      let graph: { nodes: unknown; paths: unknown; transitions: unknown }
      try {
        graph = JSON.parse(graphJson)
      } catch (parseError) {
        throw new Error("Story graph JSON is invalid. Please ensure it is valid JSON.")
      }

      const validation = validateGraph(graph)
      if (!validation.ok) {
        throw new Error(validation.message)
      }

      const normalized = normalizeSlug(slug)
      if (!normalized) {
        throw new Error("Story code is required and must use letters, numbers, or dashes.")
      }

      const conflictingStory = stories.find((story) => story.slug === normalized && story.id !== editingStoryId)
      if (conflictingStory) {
        throw new Error(`Story code already belongs to "${conflictingStory.title}". Please choose a different code.`)
      }

      const payload = {
        slug: normalized,
        title,
        summary,
        tags: parseTagsString(tags),
        visibility,
        nodes: graph.nodes,
        paths: graph.paths,
        transitions: graph.transitions,
      }

      const isEditing = Boolean(editingStoryId)
      const requestBody = isEditing ? { ...payload, storyId: editingStoryId! } : payload

      const response = await fetch("/api/creator/stories", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : null
      if (!response.ok) {
        throw new Error((data && data.error) || raw || "Unable to save story.")
      }

      if (isEditing) {
        setSlug(payload.slug)
      } else {
        resetStoryFormToNew()
      }

      try {
        await refreshStories()
        setStoriesMessage(isEditing ? "Story updated successfully." : "Story saved successfully.")
      } catch {
        // refreshStories already updates fetchError
      }

      setActiveTab("stories")
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save story.")
    } finally {
      setCreating(false)
    }
  }

  const submitNewStoryForApproval = async (ownership: { transfer: boolean; contact: boolean }) => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!ownership.transfer || !ownership.contact) {
      setPublishError("Please confirm the ownership acknowledgements before submitting.")
      return
    }

    setPublishError(null)
    setPublishSuccess(null)
    setStoriesMessage(null)
    setPublishing(true)
    try {
      let graph: { nodes: unknown; paths: unknown; transitions: unknown }
      try {
        graph = JSON.parse(graphJson)
      } catch (parseError) {
        throw new Error("Story graph JSON is invalid. Please ensure it is valid JSON.")
      }

      const validation = validateGraph(graph)
      if (!validation.ok) {
        throw new Error(validation.message)
      }

      const normalized = normalizeSlug(slug)
      if (!normalized) {
        throw new Error("Story code is required and must use letters, numbers, or dashes.")
      }

      const conflictingStory = stories.find((story) => story.slug === normalized && story.id !== editingStoryId)
      if (conflictingStory) {
        throw new Error(`Story code already belongs to "${conflictingStory.title}". Please choose a different code.`)
      }

      const payload = {
        slug: normalized,
        title,
        summary,
        tags: parseTagsString(tags),
        visibility,
        nodes: graph.nodes,
        paths: graph.paths,
        transitions: graph.transitions,
      }

      const isEditing = Boolean(editingStoryId)
      const requestBody = isEditing ? { ...payload, storyId: editingStoryId! } : payload

      const saveResponse = await fetch("/api/creator/stories", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })
      const saveRaw = await saveResponse.text()
      const saveData = saveRaw ? JSON.parse(saveRaw) : null
      if (!saveResponse.ok) {
        throw new Error((saveData && saveData.error) || saveRaw || "Unable to save story before publishing.")
      }

      if (isEditing) {
        setSlug(payload.slug)
      }

      const publishResponse = await fetch("/api/creator/stories/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: normalized,
          ownershipAcknowledgement: ownership,
        }),
      })
      const publishRaw = await publishResponse.text()
      const publishData = publishRaw ? JSON.parse(publishRaw) : null
      if (!publishResponse.ok) {
        throw new Error((publishData && publishData.error) || publishRaw || "Unable to submit for approval.")
      }

      if (publishData?.email?.delivered === false) {
        const detail =
          typeof publishData.email.message === "string"
            ? publishData.email.message
            : "the notification email could not be delivered. Please contact an admin manually."
        setPublishSuccess(`Submitted for approval, but ${detail}`)
      } else {
        setPublishSuccess("Submitted for approval. An admin has been notified.")
      }

      try {
        await refreshStories()
      } catch {
        // handled by refreshStories
      }
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Unable to submit for approval.")
    } finally {
      setPublishing(false)
    }
  }

  const submitExistingStoryForApproval = async (
    story: CreatorStory,
    ownership: { transfer: boolean; contact: boolean },
  ) => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!ownership.transfer || !ownership.contact) {
      setFetchError("Please confirm the ownership acknowledgements before submitting.")
      return
    }

    setStoriesMessage(null)
    setFetchError(null)
    setPublishingSlug(story.slug)

    try {
      const publishResponse = await fetch("/api/creator/stories/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: story.slug,
          ownershipAcknowledgement: ownership,
        }),
      })
      const publishRaw = await publishResponse.text()
      const publishData = publishRaw ? JSON.parse(publishRaw) : null
      if (!publishResponse.ok) {
        throw new Error((publishData && publishData.error) || publishRaw || "Unable to submit for approval.")
      }

      try {
        await refreshStories()
      } catch {
        // handled by refreshStories
      }

      if (publishData?.email?.delivered === false) {
        const detail =
          typeof publishData.email.message === "string"
            ? publishData.email.message
            : "the notification email could not be delivered. Please contact an admin manually."
        setStoriesMessage(`Submitted for approval, but ${detail}`)
      } else {
        setStoriesMessage(`"${story.title}" submitted for approval. An admin has been notified.`)
      }
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unable to submit story for approval.")
    } finally {
      setPublishingSlug(null)
    }
  }

  const requestPublishNewStory = () => {
    if (!canSubmitStories) {
      setPublishError("Complete your creator profile before submitting stories for approval.")
  router.push("/profile#creator")
      return
    }

    setPublishError(null)
    setPublishSuccess(null)
    setStoriesMessage(null)
    setOwnershipAck({ transfer: false, contact: false })
    setPendingPublishType("NEW")
    setPendingStory(null)
    setOwnershipModalOpen(true)
  }

  const requestPublishExistingStory = (story: CreatorStory) => {
    if (!canSubmitStories) {
      setStoriesMessage("Complete your creator profile before submitting stories for approval.")
  router.push("/profile#creator")
      return
    }

    setOwnershipAck({ transfer: false, contact: false })
    setPendingPublishType("EXISTING")
    setPendingStory(story)
    setOwnershipModalOpen(true)
  }

  const handleOwnershipConfirm = async () => {
    if (!pendingPublishType) {
      setOwnershipModalOpen(false)
      resetOwnershipModal()
      return
    }

    setOwnershipConfirmLoading(true)
    try {
      if (pendingPublishType === "NEW") {
        await submitNewStoryForApproval(ownershipAck)
      } else if (pendingPublishType === "EXISTING" && pendingStory) {
        await submitExistingStoryForApproval(pendingStory, ownershipAck)
      }
      setOwnershipModalOpen(false)
      resetOwnershipModal()
    } catch (error) {
      console.error("[creator-dashboard] Ownership confirmation failed:", error)
    } finally {
      setOwnershipConfirmLoading(false)
    }
  }

  const handleDeleteStory = (storySlug: string) => {
    setConfirmDialog({ slug: storySlug, action: 'delete' })
  }

  const confirmDeleteStory = async () => {
    if (!confirmDialog.slug) return
    setDeletingSlug(confirmDialog.slug)
    setStoriesMessage(null)
    setFetchError(null)
    setConfirmDialog({ slug: null, action: null })
    try {
      const response = await fetch("/api/creator/stories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: confirmDialog.slug }),
      })
      if (!response.ok && response.status !== 204) {
        const raw = await response.text()
        const data = raw ? JSON.parse(raw) : null
        throw new Error((data && data.error) || raw || "Unable to delete story.")
      }
      try {
        await refreshStories()
        setStoriesMessage("Story deleted successfully.")
      } catch {}
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unable to delete story.")
    } finally {
      setDeletingSlug(null)
    }
  }

  const handleEditStory = (story: CreatorStory) => {
    setEditingStoryId(story.id)
    populateFormFromStory(story)
    setStoriesMessage(null)
    setActiveTab("new")
  }

  const handleImportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setImportError(null)
    setImportSuccess(null)

    if (!importFile) {
      setImportError("Select a Twine .zip or .json file to import.")
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("twineFile", importFile)
      const overrides = {
        slug: importSlug.trim() || undefined,
        title: importTitle.trim() || undefined,
        summary: importSummary.trim() || undefined,
        tags: parseTagsString(importTags),
        visibility: importVisibility,
      }
      formData.append("overrides", JSON.stringify(overrides))

      const response = await fetch("/api/creator/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : null
      if (!response.ok) {
        throw new Error((data && data.error) || raw || "Unable to import Twine story.")
      }

      setImportSuccess(`Imported "${data?.title ?? data?.slug}" successfully.`)
      setStoriesMessage("Imported story and synchronized graph from Twine export.")
      setImportFile(null)
      setImportSlug("")
      setImportTitle("")
      setImportSummary("")
      setImportTags("")

      try {
        await refreshStories()
      } catch {
        // handled by refreshStories
      }

      setActiveTab("stories")
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import Twine story.")
    } finally {
      setImporting(false)
    }
  }

  const storiesPreview = useMemo(
    () =>
      stories.map((story) => ({
        ...story,
        decisionCount: story.transitions.filter((t) => t.to).length,
      })),
    [stories],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-pulse rounded-full h-4 w-4 bg-blue-400 mx-auto" />
          <p className="text-slate-400 text-sm">Loading creator dashboard…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-16 space-y-6">
          <Button
            asChild
            variant="ghost"
            className="text-slate-200 hover:text-white hover:bg-slate-800/60 px-6 py-3 text-base border border-slate-600/70 rounded-xl"
          >
            <Link href="/">← Back home</Link>
          </Button>
          <Card className="bg-slate-800/50 border border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Creator Tools</CardTitle>
              <CardDescription className="text-slate-400">
                Sign in to manage stories, publish journeys, and request moderation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Button onClick={() => router.push("/login")} variant="outline">
                Go to sign in
              </Button>
              <Button onClick={() => router.push("/register")} className="bg-blue-600 hover:bg-blue-700 text-white">
                Create an account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-6">
          <Button
            asChild
            variant="ghost"
            className="text-slate-200 hover:text-white hover:bg-slate-800/60 px-6 py-3 text-base border border-slate-600/70 rounded-xl"
          >
            <Link href="/">← Back home</Link>
          </Button>
          <Card className="bg-slate-800/50 border border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Become a Creator</CardTitle>
              <CardDescription className="text-slate-400">
                Upgrade your account to submit story graphs, request moderation, and publish journeys.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/creator/upgrade", { method: "POST", credentials: "include" })
                    const raw = await response.text()
                    let data: any = null
                    if (raw) {
                      try {
                        data = JSON.parse(raw)
                      } catch (parseError) {
                        console.warn("[creator-dashboard] Failed to parse upgrade response", parseError)
                      }
                    }
                    if (!response.ok) {
                      const message = (data && data.error) || raw || "Unable to upgrade."
                      throw new Error(typeof message === "string" && message.trim() ? message : "Unable to upgrade.")
                    }
                    toast({
                      title: "Creator access unlocked",
                      description: "You're ready to publish journeys and request reviews.",
                    })
                    await refresh()
                    router.refresh()
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Unable to upgrade account."
                    toast({
                      variant: "destructive",
                      title: "Upgrade failed",
                      description: message,
                    })
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upgrade my account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <AppHeader />
      
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between space-y-0 mb-4">
          <h1 className="text-5xl font-bold text-white">Creator Tools</h1>
          <Link href="/">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent">
              Back to Home
            </Button>
          </Link>
        </div>
        <p className="text-xl text-slate-400 mb-8">
          Publish immersive journeys, preview your existing stories, and keep them in sync with the platform.
        </p>

        {(creatorStatus !== "ACTIVE") && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            <p className="font-medium">Finish your creator profile before submitting stories for approval.</p>
            <p className="mt-1 text-amber-200/90">
              Current status: <span className="font-semibold">{creatorStatus ?? "DRAFT"}</span>. Complete the checklist
              and acknowledgements so the review team can approve your submissions.
            </p>
            <div className="mt-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-amber-300/60 text-amber-50 hover:bg-amber-500/20 bg-transparent"
              >
                <Link href="/profile#creator">Update creator profile</Link>
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/60 border border-slate-700 flex flex-wrap">
            <TabsTrigger value="stories">My Stories</TabsTrigger>
            <TabsTrigger value="new">Create / Update Story</TabsTrigger>
            <TabsTrigger value="import">Import from Twine</TabsTrigger>
          </TabsList>

          <TabsContent value="stories" className="space-y-6">
            {storiesMessage && (
              <p className="text-emerald-300 text-sm bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
                {storiesMessage}
              </p>
            )}
            {fetchError && (
              <p
                ref={storiesErrorRef}
                tabIndex={-1}
                className="text-red-300 text-sm bg-red-900/20 border border-red-800 rounded-lg p-4 focus:outline-none"
              >
                {fetchError}
              </p>
            )}

            {storiesPreview.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
                <div className="relative py-24 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white">No Stories Yet</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Start creating immersive journeys that help others understand different perspectives and
                    experiences.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {storiesPreview.map((story) => (
                  <div
                    key={story.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="relative p-6 space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {story.title}
                        </h3>
                        <p className="text-sm text-slate-400 line-clamp-2">{story.summary || "No summary provided."}</p>
                      </div>

                      {story.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {story.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2 pt-2 border-t border-slate-700/50">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="space-y-1">
                            <div className="text-slate-500 text-xs">Nodes</div>
                            <div className="text-white font-semibold">{story.nodes.length}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-slate-500 text-xs">Transitions</div>
                            <div className="text-white font-semibold">{story.transitions.length}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2">
                          <span className="px-2 py-1 rounded-md bg-slate-700/50 text-slate-300 capitalize">
                            {story.visibility.toLowerCase()}
                          </span>
                          <span className="text-slate-500">{new Date(story.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300"
                          onClick={() => router.push(`/creator/preview/${story.slug}`)}
                        >
                          Preview Story
                        </Button>

                        {story.reviewStatus !== "APPROVED" && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700/70 hover:text-white"
                              onClick={() => handleEditStory(story)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-900/20 border-red-800/50 text-red-300 hover:bg-red-900/40 hover:text-red-200"
                              onClick={() => handleDeleteStory(story.slug)}
                              disabled={deletingSlug === story.slug}
                            >
                              {deletingSlug === story.slug ? "Deleting…" : "Delete"}
                            </Button>
                          </div>
                        )}

                        {story.reviewStatus === "PENDING" ? (
                          <div className="w-full bg-yellow-900/20 border border-yellow-700/50 text-yellow-300 px-3 py-2 rounded text-center text-sm">
                            📋 Pending Review
                          </div>
                        ) : story.reviewStatus === "REJECTED" ? (
                          <div className="w-full bg-red-900/20 border border-red-800/50 text-red-300 px-3 py-2 rounded text-center text-sm">
                            🚫 Ask for approval again in a week
                          </div>
                        ) : story.reviewStatus === "APPROVED" ? (
                          <div className="w-full bg-emerald-900/20 border border-emerald-700/50 text-emerald-300 px-3 py-2 rounded text-center text-sm">
                            ✅ Approved
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-purple-900/20 border-purple-700/50 text-purple-300 hover:bg-purple-900/40 hover:text-purple-200"
                            onClick={() => requestPublishExistingStory(story)}
                            disabled={publishingSlug === story.slug}
                          >
                            {publishingSlug === story.slug ? "Submitting…" : "Submit for Approval"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-center">
              <Button
                onClick={() => {
                  resetStoryFormToNew()
                  setStoriesMessage(null)
                  setActiveTab("new")
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Story
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="new">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Create or Update Story</CardTitle>
                <CardDescription className="text-slate-400">
                  Provide a unique story code, metadata, and the story graph JSON. Submitting the same code overwrites
                  your existing story.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingStoryId && (
                  <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-slate-300">
                      <p className="font-medium text-slate-100">Editing existing story</p>
                      <p className="text-slate-400">
                        Reset the form if you want to start a brand new story without affecting the one you&apos;re updating.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-400/60 text-blue-200 hover:bg-blue-500/20"
                      onClick={() => {
                        resetStoryFormToNew()
                        setStoriesMessage(null)
                      }}
                    >
                      Start fresh story
                    </Button>
                  </div>
                )}
                <form className="space-y-6" onSubmit={handleCreateStory}>
                  {formError && (
                    <p
                      ref={formErrorRef}
                      tabIndex={-1}
                      className="text-red-300 text-sm bg-red-900/20 border border-red-800 rounded-lg p-4 focus:outline-none"
                    >
                      {formError}
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="slug">
                      Story code
                    </label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      onBlur={(e) => setSlug(normalizeSlug(e.target.value))}
                      required
                      placeholder="community-story-code"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">
                      Use lowercase letters, numbers, or dashes. This becomes the shareable story code shown in links.
                    </p>
                    {storyCodeConflictMessage && (
                      <p className="text-sm text-red-300">{storyCodeConflictMessage}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="title">
                      Title
                    </label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="summary">
                      Summary
                    </label>
                    <Textarea
                      id="summary"
                      value={summary ?? ""}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={3}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="tags">
                      Tags
                    </label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="comma separated"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="visibility">
                      Visibility
                    </label>
                    <select
                      id="visibility"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="UNLISTED">Unlisted</option>
                      <option value="PUBLIC">Public</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="graph">
                      Story Graph JSON
                    </label>
                    <Textarea
                      id="graph"
                      value={graphJson}
                      onChange={(e) => setGraphJson(e.target.value)}
                      rows={16}
                      className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={creating || hasStoryCodeConflict}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {creating ? "Saving…" : "Save Story"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={publishing || hasStoryCodeConflict}
                      onClick={requestPublishNewStory}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {publishing ? "Submitting…" : "Publish for Approval"}
                    </Button>
                  </div>

                  {publishError && (
                    <p
                      ref={publishErrorRef}
                      tabIndex={-1}
                      className="text-red-300 text-sm bg-red-900/20 border border-red-800 rounded-lg p-4 focus:outline-none"
                    >
                      {publishError}
                    </p>
                  )}
                  {publishSuccess && (
                    <p className="text-emerald-300 text-sm bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
                      {publishSuccess}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Import from Twine</CardTitle>
                <CardDescription className="text-slate-400">
                  Upload a Twine .zip or .json export to convert passages into Loop story graphs. Imports default to
                  private visibility until you publish them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
                      <div className="flex items-center gap-3 pb-2">
                        <BookOpen className="h-5 w-5 text-blue-300" />
                        <h3 className="text-base font-semibold text-white">Loop-ready authoring</h3>
                      </div>
                      <p className="text-sm text-slate-300">
                        Start from the curated Twee template so passages already include metadata placeholders and
                        decision syntax that matches our importer.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <Link
                          href="/twine/template.twee"
                          className="inline-flex items-center rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 font-medium text-blue-200 hover:bg-blue-500/20"
                        >
                          Download template.twee
                        </Link>
                        <Link
                          href="https://twinery.org/wiki/twison_format"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md border border-slate-600 bg-slate-800/60 px-3 py-1.5 font-medium text-slate-200 hover:bg-slate-700/70"
                        >
                          Twison reference
                        </Link>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
                      <div className="flex items-center gap-3 pb-2">
                        <UploadCloud className="h-5 w-5 text-emerald-300" />
                        <h3 className="text-base font-semibold text-white">Automate from the CLI</h3>
                      </div>
                      <p className="text-sm text-slate-300">
                        Skip manual uploads and run the Loop CLI helper against your Twison export. Swap the endpoint
                        for production and authenticate with either your session cookie or an API token.
                      </p>
                      <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-200">
                        {`# Local development
npx tsx twine/upload-to-loop.ts ./story.json \\
  --cookie "loop.session=PASTE_YOUR_VALUE" \\
  --endpoint http://localhost:3000/api/creator/import \\
  --visibility PRIVATE

# Production example
npx tsx twine/upload-to-loop.ts ./story.json \\
  --token YOUR_API_TOKEN \\
  --endpoint https://your-domain.com/api/creator/import`}
                      </pre>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
                    <div className="flex items-center gap-3 pb-2">
                      <ClipboardCheck className="h-5 w-5 text-purple-300" />
                      <h3 className="text-base font-semibold text-white">Author checklist</h3>
                    </div>
                    <p className="text-sm text-slate-300">
                      Mark off each step as you prep your Twine story. Nothing is saved—this is just a workspace helper
                      while you import.
                    </p>
                    <div className="mt-4 space-y-5">
                      {authorChecklistSections.map((section, sectionIndex) => (
                        <div
                          key={section.title}
                          className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4"
                        >
                          <h4 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                            {section.title}
                          </h4>
                          <div className="space-y-3">
                            {section.items.map((item, itemIndex) => (
                              <label key={item} className="flex items-start gap-3 text-sm text-slate-200">
                                <Checkbox
                                  checked={checklistState[sectionIndex][itemIndex]}
                                  onCheckedChange={(checked) =>
                                    handleChecklistToggle(sectionIndex, itemIndex, checked === true)
                                  }
                                  className="mt-0.5 border-slate-500 data-[state=checked]:border-blue-400 data-[state=checked]:bg-blue-500"
                                />
                                <span className="leading-relaxed">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-5 text-slate-300 hover:text-white"
                      onClick={resetChecklist}
                    >
                      Clear checklist
                    </Button>
                  </div>
                </section>

                <form className="space-y-6" onSubmit={handleImportSubmit}>
                  {importError && (
                    <p
                      ref={importErrorRef}
                      tabIndex={-1}
                      className="text-red-300 text-sm bg-red-900/20 border border-red-800 rounded-lg p-4 focus:outline-none"
                    >
                      {importError}
                    </p>
                  )}
                  {importSuccess && (
                    <p className="text-emerald-300 text-sm bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
                      {importSuccess}
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="twine-file">
                      Twine export
                    </label>
                    <Input
                      id="twine-file"
                      type="file"
                      required
                      accept=".zip,.json"
                      className="bg-slate-900 border-slate-700 text-white"
                      onChange={(event) => {
                        const selected = event.target.files?.[0] ?? null
                        setImportFile(selected)
                        if (selected && !importSlug) {
                          const guess = selected.name.replace(/\.(zip|json)$/i, "")
                          setImportSlug(normalizeSlug(guess))
                        }
                      }}
                    />
                    <p className="text-xs text-slate-500">
                      Export from Twine using the Twison addon or a JSON format, then optionally zip the result.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200" htmlFor="import-slug">
                        Story code
                      </label>
                      <Input
                        id="import-slug"
                        value={importSlug}
                        onChange={(e) => setImportSlug(normalizeSlug(e.target.value))}
                        placeholder="community-story-code"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500">
                        Leave blank to assign a code automatically during import, or enter your own letters, numbers,
                        and dashes.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200" htmlFor="import-visibility">
                        Visibility
                      </label>
                      <select
                        id="import-visibility"
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                        value={importVisibility}
                        onChange={(e) => setImportVisibility(e.target.value as typeof importVisibility)}
                      >
                        <option value="PRIVATE">Private</option>
                        <option value="UNLISTED">Unlisted</option>
                        <option value="PUBLIC">Public</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="import-title">
                      Title override (optional)
                    </label>
                    <Input
                      id="import-title"
                      value={importTitle}
                      onChange={(e) => setImportTitle(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="import-summary">
                      Summary override (optional)
                    </label>
                    <Textarea
                      id="import-summary"
                      value={importSummary}
                      onChange={(e) => setImportSummary(e.target.value)}
                      rows={3}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200" htmlFor="import-tags">
                      Tags (optional)
                    </label>
                    <Input
                      id="import-tags"
                      value={importTags}
                      onChange={(e) => setImportTags(e.target.value)}
                      placeholder="equity, resilience, accessibility"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={importing || !importFile}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {importing ? "Importing…" : "Import Story"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                      onClick={() => {
                        setImportFile(null)
                        setImportSlug("")
                        setImportTitle("")
                        setImportSummary("")
                        setImportTags("")
                        setImportError(null)
                        setImportSuccess(null)
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={ownershipModalOpen}
          onOpenChange={(open) => {
            setOwnershipModalOpen(open)
            if (!open) {
              resetOwnershipModal()
            }
          }}
        >
          <AlertDialogContent className="bg-slate-900 border border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Transfer &amp; credit acknowledgement</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-300">
                Approved stories move into Loop’s shared catalogue. We credit you permanently, and future removal
                requests happen via the Contact Us channel. Please confirm before submitting.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 text-sm text-slate-200">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={ownershipAck.transfer}
                  onCheckedChange={(checked) => setOwnershipAck((prev) => ({ ...prev, transfer: checked === true }))}
                  className="mt-0.5 border-slate-500 data-[state=checked]:border-blue-400 data-[state=checked]:bg-blue-500"
                />
                <span>
                  I understand that once approved, Loop becomes the hosting owner of this story while keeping my credit
                  line visible to participants.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={ownershipAck.contact}
                  onCheckedChange={(checked) => setOwnershipAck((prev) => ({ ...prev, contact: checked === true }))}
                  className="mt-0.5 border-slate-500 data-[state=checked]:border-blue-400 data-[state=checked]:bg-blue-500"
                />
                <span>
                  I know that removal or major edits after approval require sending a request through{" "}
                  <Link href="/contact" className="text-blue-300 hover:underline">
                    Contact Us
                  </Link>
                  .
                </span>
              </label>
            </div>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                className="bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-slate-100 focus-visible:ring-slate-500"
                onClick={() => {
                  resetOwnershipModal()
                  setOwnershipModalOpen(false)
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!ownershipAck.transfer || !ownershipAck.contact || ownershipConfirmLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleOwnershipConfirm}
              >
                {ownershipConfirmLoading ? "Submitting…" : "I agree & submit"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CRUD Confirm Dialog */}
        <AlertDialog open={!!confirmDialog.slug} onOpenChange={(open) => { if (!open) setConfirmDialog({ slug: null, action: null }) }}>
          <AlertDialogContent className="bg-slate-900 border border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-300">
                This action cannot be undone. The story will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                className="bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-slate-100 focus-visible:ring-slate-500"
                onClick={() => setConfirmDialog({ slug: null, action: null })}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteStory}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
