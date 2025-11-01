import { storyPayloadSchema, type StoryPayload } from "@/lib/server/story-graph"

const LINK_REGEX = /\[\[([^[\]]+)\]\]/g

export type TwisonLink = {
  name?: string
  link?: string
  text?: string
}

export type TwisonPassage = {
  pid?: number
  name: string
  text?: string
  tags?: string[] | string | null
  links?: TwisonLink[]
  position?: { x?: number; y?: number }
  metadata?: Record<string, unknown>
}

export type TwisonStory = {
  name?: string
  startnode?: number
  creator?: string
  creatorVersion?: string
  ifid?: string
  description?: string
  tags?: string[]
  passages?: TwisonPassage[]
}

export type TwisonImportOverrides = {
  slug?: string
  title?: string
  summary?: string
  tags?: string[]
  visibility?: "PRIVATE" | "UNLISTED" | "PUBLIC"
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")

const ensureUnique = (existing: Set<string>, base: string) => {
  let candidate = base || "node"
  let i = 1
  while (existing.has(candidate)) {
    candidate = `${base}-${i++}`
  }
  existing.add(candidate)
  return candidate
}

export function extractLinksFromText(body: string): TwisonLink[] {
  const links: TwisonLink[] = []
  if (typeof body !== "string" || !body.includes("[[")) {
    return links
  }

  let match: RegExpExecArray | null
  while ((match = LINK_REGEX.exec(body))) {
    const raw = match[1].trim()
    if (!raw) continue

    let label = raw
    let target = raw

    if (raw.includes("->")) {
      const [left, right] = raw.split("->")
      label = left.trim()
      target = right.trim()
    } else if (raw.includes("|")) {
      const [left, right] = raw.split("|")
      label = left.trim()
      target = right.trim()
    }

    if (!target) continue

    links.push({
      name: label,
      link: target,
      text: label,
    })
  }

  return links
}

const cloneTwison = (twison: TwisonStory): TwisonStory =>
  typeof structuredClone === "function"
    ? structuredClone(twison)
    : (JSON.parse(JSON.stringify(twison ?? {})) as TwisonStory)

export function repairTwisonStory(twison: TwisonStory): TwisonStory {
  const story = cloneTwison(twison ?? {})
  const passages: TwisonPassage[] = Array.isArray(story.passages) ? story.passages : []
  story.passages = passages

  const usedNames = new Set<string>()

  passages.forEach((passage, index) => {
    if (!passage || typeof passage !== "object") {
      passages[index] = {
        pid: index + 1,
        name: `passage-${index + 1}`,
        text: "",
        tags: [],
        links: [],
      }
      return
    }

    const baseName = passage.name?.trim() || `passage-${index + 1}`
    let uniqueName = baseName
    let suffix = 1
    while (usedNames.has(uniqueName)) {
      uniqueName = `${baseName}-${suffix++}`
    }
    passage.name = uniqueName
    usedNames.add(uniqueName)

    if (!passage.pid || !Number.isFinite(passage.pid)) {
      passage.pid = index + 1
    }

    if (!Array.isArray(passage.tags)) {
      if (typeof passage.tags === "string") {
        const parsedTags = passage.tags
          .split(/[\s,]+/)
          .map((tag: string) => tag.trim())
          .filter(Boolean)
        passage.tags = parsedTags
      } else {
        passage.tags = []
      }
    }

    if (!Array.isArray(passage.links)) {
      passage.links = extractLinksFromText(passage.text ?? "")
    } else {
      passage.links = passage.links.filter(
        (link) => link && typeof link === "object" && (link.link || link.name || link.text),
      )
    }

    if (passage.metadata && typeof passage.metadata !== "object") {
      passage.metadata = undefined
    }
  })

  if (!story.name || !story.name.trim()) {
    story.name = "Untitled Twine Story"
  }

  if (!story.startnode || !Number.isFinite(story.startnode)) {
    story.startnode = passages[0]?.pid ?? 1
  }

  return story
}

export function validateTwisonStory(twison: TwisonStory): { ok: true } | { ok: false; message: string } {
  if (!twison || typeof twison !== "object") {
    return { ok: false, message: "Missing Twine story payload." }
  }

  if (!Array.isArray(twison.passages) || twison.passages.length === 0) {
    return { ok: false, message: "Twine story must include passages." }
  }

  const passageNames = new Set<string>()
  for (let index = 0; index < twison.passages.length; index++) {
    const passage = twison.passages[index]
    if (!passage || typeof passage !== "object") {
      return { ok: false, message: `Passage ${index + 1} is invalid.` }
    }

    if (!passage.name || !passage.name.trim()) {
      return { ok: false, message: `Passage ${index + 1} is missing a name.` }
    }

    if (passageNames.has(passage.name)) {
      return { ok: false, message: `Duplicate passage name '${passage.name}'. Ensure passage titles are unique.` }
    }
    passageNames.add(passage.name)

    if (passage.links != null && !Array.isArray(passage.links)) {
      return { ok: false, message: `Passage '${passage.name}' has invalid link structure.` }
    }
  }

  return { ok: true }
}

export function convertTwisonToStoryPayload(
  twison: TwisonStory,
  overrides: TwisonImportOverrides = {},
): StoryPayload {
  const sanitized = repairTwisonStory(twison)
  const passages = Array.isArray(sanitized.passages) ? sanitized.passages : []
  if (!passages.length) {
    throw new Error("Twine story does not contain any passages.")
  }

  const slugBase = overrides.slug ?? slugify(sanitized.name ?? "twine-story")
  const slug = slugBase || "twine-story"
  const title = overrides.title ?? sanitized.name ?? "Imported Twine Story"
  const tags = overrides.tags ?? sanitized.tags ?? []

  const nodeKeySet = new Set<string>()
  const nodeMap = new Map<string, string>()

  const nodes = passages.map((passage) => {
    const keyBase = slugify(passage.name)
    const key = ensureUnique(nodeKeySet, keyBase)
    nodeMap.set(passage.name, key)

    const linkCount = passage.links?.length ?? 0
    const passageTags = Array.isArray(passage.tags) ? passage.tags : []
    const hasDecisionTag = passageTags.some((tag) => tag.toLowerCase() === "decision")
    let type: "NARRATIVE" | "DECISION" | "RESOLUTION" = "NARRATIVE"

    if (linkCount > 1 || hasDecisionTag) {
      type = "DECISION"
    } else if (linkCount === 0) {
      type = "RESOLUTION"
    }

    const text = passage.text?.trim() ?? ""

    return {
      key,
      title: passage.name,
      synopsis: text.split("\n").slice(0, 2).join(" ").slice(0, 160) || undefined,
      type,
      content: {
        text,
        tags: passageTags,
        metadata: {
          pid: passage.pid,
          position: passage.position ?? null,
          raw: passage,
        },
      },
      media: passage.metadata?.media ?? undefined,
    }
  })

  const pathKeySet = new Set<string>()
  const pathsMap = new Map<string, { key: string; label: string; summary?: string; metadata?: unknown }>()
  const transitions: StoryPayload["transitions"] = []

  for (const passage of passages) {
    const fromKey = nodeMap.get(passage.name)
    if (!fromKey) continue

    const links = passage.links ?? []
    if (links.length === 0) {
      const pathKey = ensureUnique(pathKeySet, `${fromKey}__end`)
      pathsMap.set(pathKey, { key: pathKey, label: "End", metadata: { ending: true } })
      transitions.push({
        from: fromKey,
        path: pathKey,
        to: null,
        ordering: 0,
      })
      continue
    }

    links.forEach((link, index) => {
      const targetName = link.link ?? link.name ?? link.text ?? ""
      const toKey = nodeMap.get(targetName)
      if (!toKey) return

      const pathKey = ensureUnique(pathKeySet, `${fromKey}__${slugify(link.text ?? link.name ?? link.link ?? "choice")}`)
      const label = link.text ?? link.name ?? link.link ?? "Continue"
      if (!pathsMap.has(pathKey)) {
        pathsMap.set(pathKey, {
          key: pathKey,
          label,
          metadata: {
            sourceTag: link.name ?? link.link ?? null,
          },
        })
      }

      transitions.push({
        from: fromKey,
        path: pathKey,
        to: toKey,
        ordering: index,
      })
    })
  }

  const summary =
    overrides.summary ??
    sanitized.description ??
    nodes
      .map((node) => node.synopsis ?? "")
      .filter(Boolean)
      .slice(0, 2)
      .join(" ")
      .slice(0, 250)

  const visibility = overrides.visibility ?? "PRIVATE"

  const payload: StoryPayload = {
    slug,
    title,
    summary,
    tags,
    visibility,
    nodes,
    paths: Array.from(pathsMap.values()),
    transitions,
  }

  return storyPayloadSchema.parse(payload)
}

export function suggestAvatarFromTwison(passage?: TwisonPassage) {
  if (!passage) return null
  const resources: Record<string, number> = {}
  const matches = passage.text?.match(/(\w+):\s*(\d{1,3})/g) ?? []
  matches.forEach((match) => {
    const [key, value] = match.split(":")
    const numeric = Number.parseInt(value?.trim() ?? "0", 10)
    if (Number.isFinite(numeric)) {
      resources[slugify(key)] = Math.min(Math.max(numeric, 0), 100)
    }
  })

  return {
    name: passage.name,
    background: passage.text?.slice(0, 240) ?? undefined,
    initialResources: Object.keys(resources).length ? resources : undefined,
  }
}
