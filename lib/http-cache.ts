export const cachePolicy = {
  storyPublic: "public, s-maxage=300, stale-while-revalidate=3600",
  collectionPublic: "public, s-maxage=120, stale-while-revalidate=300",
  privateNoStore: "private, no-store",
  strictNoStore: "no-cache, no-store, must-revalidate",
} as const

export function setCacheControl<T extends Response>(response: T, value: string): T {
  response.headers.set("Cache-Control", value)
  return response
}
