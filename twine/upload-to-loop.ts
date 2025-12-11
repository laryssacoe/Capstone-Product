#!/usr/bin/env tsx

/**
 * Upload a Twison export directly into the Loop creator API.
 *
 * Usage:
 *   npx tsx twine/upload-to-loop.ts ./my-story.json \
 *     --endpoint http://localhost:3000/api/creator/import \
 *     --cookie "loop.session=YOUR_COOKIE_VALUE" \
 *     --slug community-bridge \
 *     --visibility PRIVATE \
 *     --avatar ./avatar-metadata.json
 *
 * Avatar metadata JSON example:
 * {
 *   "name": "Character Name",
 *   "age": 25,
 *   "background": "Character background description...",
 *   "appearance": {
 *     "image": "/scenes/character-profile.png",
 *     "skinTone": "medium",
 *     "hairColor": "dark brown"
 *   },
 *   "initialResources": {
 *     "money": 100,
 *     "time": 100,
 *     "socialSupport": 50,
 *     "mentalHealth": 70,
 *     "physicalHealth": 80
 *   },
 *   "socialContext": {
 *     "socioeconomicStatus": "working class",
 *     "location": "Urban area"
 *   },
 *   "isPlayable": true
 * }
 *
 * Requirements:
 * - Node 18+ (global fetch and FormData support).
 * - Supply either a session cookie (`--cookie` / LOOP_IMPORT_COOKIE) or a bearer token
 *   (`--token` / LOOP_IMPORT_TOKEN) when calling a deployed environment.
 */

import { basename, resolve } from "node:path"
import { readFile } from "node:fs/promises"

interface AvatarMetadata {
  name: string
  age?: number
  background: string
  appearance?: {
    skinTone?: string
    hairColor?: string
    hairStyle?: string
    clothing?: string
    accessories?: string[]
    image?: string
  }
  initialResources: {
    money: number
    time: number
    socialSupport?: number
    mentalHealth?: number
    physicalHealth?: number
  }
  socialContext?: {
    socioeconomicStatus?: string
    location?: string
    familyStructure?: string
    educationLevel?: string
    employmentStatus?: string
    healthConditions?: string[]
    socialIssues?: {
      id: string
      type: string
      severity: string
      description: string
      impacts: string[]
    }[]
  }
  isPlayable?: boolean
}

interface CLIOptions {
  endpoint: string
  cookie?: string
  token?: string
  slug?: string
  title?: string
  summary?: string
  tags?: string
  visibility?: "PRIVATE" | "UNLISTED" | "PUBLIC"
  avatarPath?: string
  avatarName?: string
  avatarBackground?: string
  avatarImage?: string
  avatarMoney?: number
  avatarTime?: number
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
      case "avatar":
        options.avatarPath = resolve(value)
        break
      case "avatar-name":
        options.avatarName = value
        break
      case "avatar-background":
        options.avatarBackground = value
        break
      case "avatar-image":
        options.avatarImage = value
        break
      case "avatar-money":
        options.avatarMoney = parseInt(value, 10)
        if (isNaN(options.avatarMoney)) {
          throw new Error("--avatar-money must be a number.")
        }
        break
      case "avatar-time":
        options.avatarTime = parseInt(value, 10)
        if (isNaN(options.avatarTime)) {
          throw new Error("--avatar-time must be a number.")
        }
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

Story Options:
  --endpoint <url>       Import endpoint (default: ${defaultEndpoint})
  --cookie <value>       Session cookie string, e.g. "loop.session=abc123"
  --token <value>        Bearer token for the import API
  --slug <slug>          Override slug for the story
  --title <title>        Override title
  --summary <text>       Override summary/description
  --tags <list>          Comma separated tags (e.g. "equity, empathy")
  --visibility <value>   PRIVATE | UNLISTED | PUBLIC

Avatar Options:
  --avatar <path>        Path to avatar metadata JSON file
  --avatar-name <name>   Character name (if not using --avatar file)
  --avatar-background <text>  Character background (if not using --avatar file)
  --avatar-image <path>  Profile image path (e.g. "/scenes/character.png")
  --avatar-money <num>   Initial money resource (default: 100)
  --avatar-time <num>    Initial time resource in hours (default: 100)

Environment Overrides:
  LOOP_IMPORT_ENDPOINT   Default endpoint
  LOOP_IMPORT_COOKIE     Session cookie to reuse
  LOOP_IMPORT_TOKEN      API token (Bearer prefix optional)

Avatar Metadata JSON Structure:
  {
    "name": "Character Name",
    "age": 25,
    "background": "Character background description...",
    "appearance": {
      "image": "/scenes/character-profile.png",
      "skinTone": "medium",
      "hairColor": "dark brown",
      "hairStyle": "ponytail",
      "clothing": "casual",
      "accessories": ["backpack"]
    },
    "initialResources": {
      "money": 100,
      "time": 100,
      "socialSupport": 50,
      "mentalHealth": 70,
      "physicalHealth": 80
    },
    "socialContext": {
      "socioeconomicStatus": "working class",
      "location": "Urban area",
      "familyStructure": "Single parent household",
      "educationLevel": "High school",
      "employmentStatus": "Part-time",
      "healthConditions": [],
      "socialIssues": [
        {
          "id": "issue-1",
          "type": "poverty",
          "severity": "high",
          "description": "Description of the social issue",
          "impacts": ["money", "stress", "opportunities"]
        }
      ]
    },
    "isPlayable": true
  }

Examples:
  # Import with avatar JSON file
  npx tsx twine/upload-to-loop.ts ./story.json \\
    --cookie "loop.session=abc123" \\
    --avatar ./avatar.json

  # Import with inline avatar options
  npx tsx twine/upload-to-loop.ts ./story.json \\
    --cookie "loop.session=abc123" \\
    --avatar-name "Maria Santos" \\
    --avatar-background "A single mother navigating housing insecurity" \\
    --avatar-image "/scenes/maria-profile.png" \\
    --avatar-money 150 \\
    --avatar-time 80
`)
}

async function loadAvatarMetadata(options: CLIOptions): Promise<AvatarMetadata | undefined> {
  // Load from JSON file if provided
  if (options.avatarPath) {
    try {
      const content = await readFile(options.avatarPath, "utf8")
      const parsed = JSON.parse(content)
      
      // Validate required fields
      if (!parsed.name || typeof parsed.name !== "string") {
        throw new Error("Avatar JSON must include a 'name' field.")
      }
      if (!parsed.background || typeof parsed.background !== "string") {
        throw new Error("Avatar JSON must include a 'background' field.")
      }
      if (!parsed.initialResources || typeof parsed.initialResources !== "object") {
        throw new Error("Avatar JSON must include 'initialResources' object.")
      }
      if (typeof parsed.initialResources.money !== "number") {
        throw new Error("Avatar initialResources must include 'money' as a number.")
      }
      if (typeof parsed.initialResources.time !== "number") {
        throw new Error("Avatar initialResources must include 'time' as a number.")
      }
      
      return parsed as AvatarMetadata
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Avatar file not found: ${options.avatarPath}`)
      }
      throw error
    }
  }
  
  // Build from inline options if provided
  if (options.avatarName || options.avatarBackground) {
    if (!options.avatarName) {
      throw new Error("--avatar-name is required when using inline avatar options.")
    }
    if (!options.avatarBackground) {
      throw new Error("--avatar-background is required when using inline avatar options.")
    }
    
    const avatar: AvatarMetadata = {
      name: options.avatarName,
      background: options.avatarBackground,
      initialResources: {
        money: options.avatarMoney ?? 100,
        time: options.avatarTime ?? 100,
        socialSupport: 50,
        mentalHealth: 70,
        physicalHealth: 80,
      },
      isPlayable: true,
    }
    
    if (options.avatarImage) {
      avatar.appearance = {
        image: options.avatarImage,
      }
    }
    
    return avatar
  }
  
  return undefined
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

    // Build overrides including avatar metadata
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
    
    // Load avatar metadata
    const avatarMetadata = await loadAvatarMetadata(options)
    if (avatarMetadata) {
      overrides.avatar = avatarMetadata
      console.log(`📋 Including avatar profile: "${avatarMetadata.name}"`)
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

    if (payload) {
      console.log(`Imported story "${payload.title}" (${payload.slug})`)
      console.log(`  ${payload.nodes} nodes, ${payload.paths} paths`)
      if (payload.hasAvatar) {
        console.log(`   Avatar profile included`)
      }
    } else {
      console.log(`Import completed via ${options.endpoint}`)
    }

  } catch (error) {
    console.error(`❌ ${(error as Error).message}`)
    process.exit(1)
  }
}

void main()