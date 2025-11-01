import { extractLinksFromText, type TwisonPassage, type TwisonStory } from "@/lib/server/twine-transform"

const STORYDATA_REGEX = /<tw-storydata([^>]*)>([\s\S]*?)<\/tw-storydata>/i
const PASSAGE_REGEX = /<tw-passagedata([^>]*)>([\s\S]*?)<\/tw-passagedata>/gi

const ATTR_REGEX = /([\w-]+)="([^"]*)"/g

const decodeHtml = (input: string) =>
  input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

const parseAttributes = (input: string) => {
  const attrs: Record<string, string> = {}
  if (!input) return attrs
  let match: RegExpExecArray | null
  while ((match = ATTR_REGEX.exec(input))) {
    const [, key, value] = match
    attrs[key] = value
  }
  return attrs
}

const parsePosition = (value?: string) => {
  if (!value) return undefined
  const [x, y] = value.split(",").map((part) => Number.parseFloat(part.trim()))
  if (Number.isFinite(x) && Number.isFinite(y)) {
    return { x, y }
  }
  return undefined
}

const parseSize = (value?: string) => {
  if (!value) return undefined
  const [width, height] = value.split(",").map((part) => Number.parseFloat(part.trim()))
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { width, height }
  }
  return undefined
}

export function twineHtmlToTwison(html: string): TwisonStory {
  if (!html || typeof html !== "string") {
    throw new Error("Twine HTML export is empty.")
  }

  const storyMatch = html.match(STORYDATA_REGEX)
  if (!storyMatch) {
    throw new Error("Unable to find <tw-storydata> block. Export the story HTML from Twine 2.")
  }

  const storyAttributes = parseAttributes(storyMatch[1] ?? "")
  const storyBody = storyMatch[2] ?? ""

  const passages: TwisonPassage[] = []
  let passageMatch: RegExpExecArray | null

  while ((passageMatch = PASSAGE_REGEX.exec(storyBody))) {
    const passageAttributes = parseAttributes(passageMatch[1] ?? "")
    const rawText = decodeHtml(passageMatch[2] ?? "")

    const pidValue = passageAttributes.pid ? Number.parseInt(passageAttributes.pid, 10) : undefined
    const nameValue = passageAttributes.name?.trim() || `passage-${passages.length + 1}`
    const tagValue = passageAttributes.tags?.trim() ?? ""

    const passage: TwisonPassage = {
      pid: Number.isFinite(pidValue) ? pidValue : undefined,
      name: nameValue,
      text: rawText,
      tags: tagValue
        ? tagValue
            .split(/\s+/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      links: extractLinksFromText(rawText),
      position: parsePosition(passageAttributes.position),
      metadata: {},
    }

    const size = parseSize(passageAttributes.size)
    if (size) {
      passage.metadata = { ...(passage.metadata ?? {}), size }
    }

    passages.push(passage)
  }

  if (!passages.length) {
    throw new Error("No <tw-passagedata> elements were found in the Twine HTML export.")
  }

  const startNodeRaw = storyAttributes.startnode ? Number.parseInt(storyAttributes.startnode, 10) : undefined
  const startnode = Number.isFinite(startNodeRaw) ? startNodeRaw : passages[0]?.pid ?? 1

  return {
    name: storyAttributes.name ?? "Untitled Twine Story",
    startnode,
    creator: storyAttributes.creator,
    creatorVersion: storyAttributes["creator-version"],
    ifid: storyAttributes.ifid,
    passages,
  }
}
