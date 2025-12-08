import { setTimeout as delay } from "node:timers/promises"

type KickboxResponse = {
  result?: string
  reason?: string
  disposable?: boolean
  role?: boolean
  free?: boolean
  accept_all?: boolean
  did_you_mean?: string | null
}

export type EmailVerificationResult = {
  deliverable: boolean
  reason?: string
  raw?: KickboxResponse | null
}

export async function verifyEmailWithKickbox(email: string): Promise<EmailVerificationResult> {
  const apiKey = process.env.KICKBOX_API_KEY
  if (!apiKey) {
    return { deliverable: true, reason: "Skipped (no KICKBOX_API_KEY set)", raw: null }
  }

  const controller = new AbortController()
  const timeoutMs = Number(process.env.KICKBOX_TIMEOUT_MS ?? 5000)
  const timer = delay(timeoutMs).then(() => controller.abort())

  try {
    const url = new URL("https://api.kickbox.com/v2/verify")
    url.searchParams.set("email", email)
    url.searchParams.set("apikey", apiKey)

    const response = await fetch(url.toString(), { signal: controller.signal })
    if (!response.ok) {
      return {
        deliverable: false,
        reason: `Verification service error (${response.status})`,
        raw: null,
      }
    }

    const data = (await response.json()) as KickboxResponse
    const result = (data.result ?? "").toLowerCase()

    if (result === "deliverable") {
      return { deliverable: true, raw: data }
    }

    return {
      deliverable: false,
      reason: data.reason ?? result ?? "Email is not deliverable",
      raw: data,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      deliverable: false,
      reason: `Verification unavailable: ${message}`,
      raw: null,
    }
  } finally {
    controller.abort()
    await timer.catch(() => {})
  }
}
