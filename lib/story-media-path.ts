const cloudinarySceneFolderAliases: Record<string, string> = {
  "marcus-waiting-room": "marcus/marcus",
  marcus: "marcus/marcus",
  "daniel-water-and-land": "daniel/daniel",
  daniel: "daniel/daniel",
}

function startsWithSegments(input: string[], prefix: string[]): boolean {
  if (prefix.length === 0 || input.length < prefix.length) return false
  return prefix.every((segment, index) => (input[index] ?? "").toLowerCase() === segment.toLowerCase())
}

function collapseAdjacentPathSegments(segments: string[]): string[] {
  const normalized: string[] = []
  let previousKey = ""

  segments.forEach((segment) => {
    const trimmed = segment.trim()
    if (!trimmed) return

    const currentKey = decodeURIComponent(trimmed).toLowerCase()
    if (currentKey === previousKey) return

    normalized.push(trimmed)
    previousKey = currentKey
  })

  return normalized
}

function dedupeCloudinaryPathSegments(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("cloudinary.com")) return url

    const segments = parsed.pathname.split("/")
    const uploadIndex = segments.findIndex((segment) => segment === "upload")
    if (uploadIndex === -1) return url

    const prefix = segments.slice(0, uploadIndex + 1)
    const suffix = segments.slice(uploadIndex + 1)
    const normalizedSuffix = collapseAdjacentPathSegments(suffix)

    parsed.pathname = [...prefix, ...normalizedSuffix].join("/")
    return parsed.toString()
  } catch {
    return url
  }
}

function normalizeCloudinarySceneFolder(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("cloudinary.com")) return url

    const pathSegments = parsed.pathname.split("/")
    const loopIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "loop")
    if (loopIndex === -1 || pathSegments[loopIndex + 1]?.toLowerCase() !== "scenes") return url

    const storyFolderRaw = pathSegments[loopIndex + 2]
    if (!storyFolderRaw) return url

    const storyFolder = decodeURIComponent(storyFolderRaw).toLowerCase()
    const alias = cloudinarySceneFolderAliases[storyFolder]
    if (!alias) return url

    const aliasParts = alias.split("/").filter(Boolean)
    const aliasTail = aliasParts.slice(1)
    let afterStory = pathSegments.slice(loopIndex + 3)
    while (aliasTail.length > 0 && startsWithSegments(afterStory, aliasTail)) {
      afterStory = afterStory.slice(aliasTail.length)
    }

    parsed.pathname = [
      ...pathSegments.slice(0, loopIndex + 2),
      ...aliasParts,
      ...afterStory,
    ].join("/")

    return parsed.toString()
  } catch {
    return url
  }
}

export function normalizeImagePath(value: unknown): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed) return ""

  if (/^https?:\/\//i.test(trimmed)) {
    const deduped = dedupeCloudinaryPathSegments(trimmed)
    return normalizeCloudinarySceneFolder(deduped)
  }

  if (trimmed.startsWith("data:")) return trimmed
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}