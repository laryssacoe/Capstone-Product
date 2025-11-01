import nodemailer, { type Transporter } from "nodemailer"

type MailerConfig = {
  host: string
  port: number
  user: string
  pass: string
  secure: boolean
  fromAddress: string
  fromName?: string
  adminEmail: string
  appBaseUrl?: string
}

let cachedTransporter: Transporter | null = null
let cachedConfig: MailerConfig | null = null

export function resolveMailerConfig(): MailerConfig | null {
  if (cachedConfig) {
    return cachedConfig
  }

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true
  const fromAddress = process.env.MAIL_FROM_ADDRESS
  const fromName = process.env.MAIL_FROM_NAME
  const adminEmail = process.env.ADMIN_APPROVAL_EMAIL
  const appBaseUrl = process.env.APP_BASE_URL

  if (!host || !port || !user || !pass || !fromAddress || !adminEmail) {
    return null
  }

  const cfg: MailerConfig = {
    host,
    port: Number(port),
    user,
    pass,
    secure,
    fromAddress,
    fromName: fromName ?? undefined,
    adminEmail,
    appBaseUrl: appBaseUrl?.replace(/\/+$/, ""),
  }

  cachedConfig = cfg
  return cfg
}

export function isMailerConfigured(): boolean {
  return resolveMailerConfig() !== null
}

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter
  }

  const config = resolveMailerConfig()
  if (!config) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM_ADDRESS, and ADMIN_APPROVAL_EMAIL.")
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    secure: config.secure,
  })

  return cachedTransporter
}

export interface StorySubmissionEmailContext {
  storyTitle: string
  storySlug: string
  versionId: string
  versionNumber: number
  submitterEmail?: string | null
  submitterUsername?: string | null
  approveUrl?: string
  rejectUrl?: string
  previewUrl?: string
}

export async function sendStorySubmissionEmail(context: StorySubmissionEmailContext): Promise<void> {
  const config = resolveMailerConfig()
  if (!config) {
    console.warn("[mailer] SMTP configuration missing. Skipping story submission email.")
    return
  }

  const transporter = await getTransporter()

  const from = config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress
  const subject = `[Loop] Story submission pending approval: ${context.storyTitle}`

  const submitterLabel =
    context.submitterUsername ??
    context.submitterEmail ??
    "A creator"

  const textParts = [
    `${submitterLabel} submitted "${context.storyTitle}" (slug: ${context.storySlug}) for approval.`,
    `Version: ${context.versionNumber} (ID: ${context.versionId}).`,
  ]

  if (context.previewUrl) {
    textParts.push(`Preview: ${context.previewUrl}`)
  }
  if (context.approveUrl) {
    textParts.push(`Approve: ${context.approveUrl}`)
  }
  if (context.rejectUrl) {
    textParts.push(`Reject: ${context.rejectUrl}`)
  }

  const textBody = textParts.join("\n")

  const htmlBody = `
    <p>${submitterLabel} submitted <strong>${context.storyTitle}</strong> (slug: <code>${context.storySlug}</code>) for review.</p>
    <p>Version: <strong>${context.versionNumber}</strong> (ID: <code>${context.versionId}</code>).</p>
    ${
      context.previewUrl
        ? `<p><a href="${context.previewUrl}">Preview this story</a></p>`
        : ""
    }
    <p>
      ${
        context.approveUrl
          ? `<a href="${context.approveUrl}" style="margin-right:16px;display:inline-block;padding:10px 18px;background:#22c55e;color:#fff;text-decoration:none;border-radius:8px;">Approve</a>`
          : ""
      }
      ${
        context.rejectUrl
          ? `<a href="${context.rejectUrl}" style="margin-right:16px;display:inline-block;padding:10px 18px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;">Reject</a>`
          : ""
      }
    </p>
  `

  await transporter.sendMail({
    from,
    to: config.adminEmail,
    subject,
    text: textBody,
    html: htmlBody,
  })
}

export interface StoryPendingUpdateEmailContext extends StorySubmissionEmailContext {
  previousVersionNumber?: number
}

export async function sendStoryPendingUpdateEmail(context: StoryPendingUpdateEmailContext): Promise<void> {
  const config = resolveMailerConfig()
  if (!config) {
    console.warn("[mailer] SMTP configuration missing. Skipping pending story update email.")
    return
  }

  const transporter = await getTransporter()

  const from = config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress
  const subject = `[Loop] Pending story updated: ${context.storyTitle}`

  const submitterLabel =
    context.submitterUsername ??
    context.submitterEmail ??
    "A creator"

  const textParts = [
    `${submitterLabel} updated \"${context.storyTitle}\" (slug: ${context.storySlug}) while it awaits approval.`,
    `Updated version: ${context.versionNumber} (ID: ${context.versionId}).`,
  ]

  if (context.previousVersionNumber != null) {
    textParts.push(`Previous version number: ${context.previousVersionNumber}.`)
  }

  if (context.previewUrl) {
    textParts.push(`Preview: ${context.previewUrl}`)
  }
  if (context.approveUrl) {
    textParts.push(`Approve: ${context.approveUrl}`)
  }
  if (context.rejectUrl) {
    textParts.push(`Reject: ${context.rejectUrl}`)
  }

  const textBody = textParts.join("\n")

  const htmlBody = `
    <p>${submitterLabel} updated <strong>${context.storyTitle}</strong> (slug: <code>${context.storySlug}</code>) while it awaits review.</p>
    <p>Updated version: <strong>${context.versionNumber}</strong> (ID: <code>${context.versionId}</code>).</p>
    ${
      context.previousVersionNumber != null
        ? `<p>Previous version number: <strong>${context.previousVersionNumber}</strong>.</p>`
        : ""
    }
    ${
      context.previewUrl
        ? `<p><a href="${context.previewUrl}">Preview this story</a></p>`
        : ""
    }
    <p>
      ${
        context.approveUrl
          ? `<a href="${context.approveUrl}" style="margin-right:16px;display:inline-block;padding:10px 18px;background:#22c55e;color:#fff;text-decoration:none;border-radius:8px;">Approve</a>`
          : ""
      }
      ${
        context.rejectUrl
          ? `<a href="${context.rejectUrl}" style="margin-right:16px;display:inline-block;padding:10px 18px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;">Reject</a>`
          : ""
      }
    </p>
  `

  await transporter.sendMail({
    from,
    to: config.adminEmail,
    subject,
    text: textBody,
    html: htmlBody,
  })
}

export function buildStoryApprovalLinks(storySlug: string, versionId: string, token: string) {
  const config = resolveMailerConfig()
  if (!config?.appBaseUrl) {
    return {
      approveUrl: undefined,
      rejectUrl: undefined,
      previewUrl: undefined,
    }
  }

  const base = config.appBaseUrl
  const query = `versionId=${encodeURIComponent(versionId)}&token=${encodeURIComponent(token)}`

  return {
    approveUrl: `${base}/api/creator/stories/publish/decision?${query}&decision=approve`,
    rejectUrl: `${base}/api/creator/stories/publish/decision?${query}&decision=reject`,
    previewUrl: `${base}/admin/review?slug=${encodeURIComponent(storySlug)}&${query}`,
  }
}
