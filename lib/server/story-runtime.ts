import { resolveStoryRuntimeConfig, type StoryRuntimeConfig } from "@/lib/story-runtime-config"

type RuntimeSourceParams = {
  scenarioMetadata?: unknown
  storyMetadata?: unknown
  versionMetadata?: unknown
  versionContent?: unknown
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function pickRuntimeFromRecord(value: unknown): unknown | null {
  const record = asRecord(value)
  if (Object.keys(record).length === 0) return null

  const direct = record.storyRuntime ?? record.simulation
  if (direct !== undefined) return direct

  const nestedMetadata = asRecord(record.metadata)
  const nested = nestedMetadata.storyRuntime ?? nestedMetadata.simulation
  if (nested !== undefined) return nested

  return null
}

export function resolveRuntimeConfigFromSources(params: RuntimeSourceParams): StoryRuntimeConfig | null {
  const candidates = [
    params.scenarioMetadata,
    params.storyMetadata,
    params.versionMetadata,
    params.versionContent,
  ]

  for (const candidate of candidates) {
    const runtimeRaw = pickRuntimeFromRecord(candidate)
    if (runtimeRaw === null) continue
    const normalized = resolveStoryRuntimeConfig(runtimeRaw)
    if (normalized) return normalized
  }

  return null
}
