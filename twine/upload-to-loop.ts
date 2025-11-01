#!/usr/bin/env tsx

/**
 * Upload a Twison export directly into the Loop creator API.
 *
 * Usage:
 *   npx tsx twine/upload-to-loop.ts ./my-story.json \
 *     --endpoint http://localhost:3000/api/creator/import \
 *     --cookie "loop.session=YOUR_COOKIE_VALUE" \
 *     --slug community-bridge \
 *     --visibility PRIVATE
 *
 * Requirements:
 * - Node 18+ (global fetch and FormData support).
 * - Supply either a session cookie (`--cookie` / LOOP_IMPORT_COOKIE) or a bearer token
 *   (`--token` / LOOP_IMPORT_TOKEN) when calling a deployed environment.
 */

import { basename, resolve } from "node:path"
import { readFile } from "node:fs/promises"

interface CLIOptions {
  endpoint: string
  cookie?: string
  token?: string
  slug?: string
  title?: string
  summary?: string
  tags?: string
  visibility?: "PRIVATE" | "UNLISTED" | "PUBLIC"
}

function parseArgs(argv: string[]): { filePath: string; options: CLIOptions } {
  if (argv.length === 0) {
    throw new Error("Missing Twison export path. Run with --help for usage information.")
  }

  if (argv[0] === "--help" || argv[0] === "-h") {
    printHelp()
    process.exit(0)
  }

  const filePath = resolve(argv[0])
  const options: CLIOptions = {
    endpoint: process.env.LOOP_IMPORT_ENDPOINT ?? "http://localhost:3000/api/creator/import",
  }

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith("--")) {
      continue
    }

    const key = arg.slice(2)
    const value = argv[i + 1]

    if (value == null || value.startsWith("--")) {
      throw new Error(`Flag "--${key}" is missing a value.`)
    }

    switch (key) {
      case "endpoint":
        options.endpoint = value
        break
      case "cookie":
        options.cookie = value
        break
      case "token":
        options.token = value
        break
      case "slug":
        options.slug = value
        break
      case "title":
        options.title = value
        break
      case "summary":
        options.summary = value
        break
      case "tags":
        options.tags = value
        break
      case "visibility":
        if (!["PRIVATE", "UNLISTED", "PUBLIC"].includes(value)) {
          throw new Error('Visibility must be one of "PRIVATE", "UNLISTED", or "PUBLIC".')
        }
        options.visibility = value as CLIOptions["visibility"]
        break
      default:
        throw new Error(`Unknown flag "--${key}". Run with --help for usage information.`)
    }
    i++
  }

  if (!options.cookie) {
    const envCookie = process.env.LOOP_IMPORT_COOKIE
    if (envCookie) {
      options.cookie = envCookie
    }
  }

  if (!options.token) {
    const envToken = process.env.LOOP_IMPORT_TOKEN
    if (envToken) {
      options.token = envToken
    }
  }

  if (!options.cookie && !options.token) {
    throw new Error(
      "Missing authentication. Provide --cookie \"loop.session=...\" or --token YOUR_API_TOKEN (environment variables LOOP_IMPORT_COOKIE / LOOP_IMPORT_TOKEN are also supported).",
    )
  }

  return { filePath, options }
}

function printHelp() {
  const defaultEndpoint = process.env.LOOP_IMPORT_ENDPOINT ?? "http://localhost:3000/api/creator/import"
  console.log(`
Usage:
  npx tsx twine/upload-to-loop.ts ./story.json [options]

Options:
  --endpoint <url>     Import endpoint (default: ${defaultEndpoint})
  --cookie <value>     Session cookie string, e.g. "loop.session=abc123"
  --token <value>      Bearer token for the import API (omit "Bearer " prefix if you like)
  --slug <slug>        Override slug for the story
  --title <title>      Override title
  --summary <text>     Override summary/description
  --tags <list>        Comma separated tags (e.g. "equity, empathy")
  --visibility <value> PRIVATE | UNLISTED | PUBLIC

Environment overrides:
  LOOP_IMPORT_ENDPOINT   Default endpoint
  LOOP_IMPORT_COOKIE     Session cookie to reuse
  LOOP_IMPORT_TOKEN      API token (Bearer prefix optional)
`)
}

async function main() {
  try {
    const { filePath, options } = parseArgs(process.argv.slice(2))
    const fileBuffer = await readFile(filePath)
    const fileName = basename(filePath)
    const lowerName = fileName.toLowerCase()
    const form = new FormData()

    if (lowerName.endsWith(".json")) {
      const json = fileBuffer.toString("utf8")
      let parsed: any
      try {
        parsed = JSON.parse(json)
      } catch (error) {
        throw new Error(`Unable to parse JSON at ${filePath}: ${(error as Error).message}`)
      }

      if (!parsed || typeof parsed !== "object" || !parsed.passages) {
        throw new Error(
          "The provided file does not look like a Twison export. Confirm you exported using the Twison story format.",
        )
      }

      form.append("twineFile", new Blob([json], { type: "application/json" }), fileName)
    } else if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
      const html = fileBuffer.toString("utf8")
      if (!html.includes("<tw-storydata")) {
        console.warn(
          'Warning: HTML export does not include a "<tw-storydata>" element. The importer may reject this file.',
        )
      }
      form.append("twineFile", new Blob([html], { type: "text/html" }), fileName)
    } else {
      const mime = lowerName.endsWith(".zip") ? "application/zip" : "application/octet-stream"
      form.append("twineFile", new Blob([fileBuffer], { type: mime }), fileName)
    }

    const overrides: Record<string, unknown> = {}
    if (options.slug) overrides.slug = options.slug
    if (options.title) overrides.title = options.title
    if (options.summary) overrides.summary = options.summary
    if (options.visibility) overrides.visibility = options.visibility
    if (options.tags) {
      overrides.tags = options.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    }

    if (Object.keys(overrides).length > 0) {
      form.append("overrides", JSON.stringify(overrides))
    }

    const headers: Record<string, string> = {}
    if (options.cookie) {
      headers.Cookie = options.cookie
    }
    if (options.token) {
      headers.Authorization = options.token.startsWith("Bearer ")
        ? options.token
        : `Bearer ${options.token}`
    }

    const response = await fetch(options.endpoint, {
      method: "POST",
      body: form,
      headers,
    })

    const text = await response.text()
    let payload: any = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      // Ignore JSON parsing errors, raw text will be logged below.
    }

    if (!response.ok) {
      const message = payload?.error ?? response.statusText ?? "Unknown error"
      throw new Error(`Import failed (${response.status}): ${message}`)
    }

    const summary = payload
      ? `Imported story "${payload.title}" (${payload.slug}) with ${payload.nodes} nodes and ${payload.paths} paths via ${options.endpoint}.`
      : `Import completed via ${options.endpoint}.`

  } catch (error) {
    console.error((error as Error).message)
    process.exit(1)
  }
}

void main()
