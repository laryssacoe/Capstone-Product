const fallbackLogoPath = "/images/logo.png"

function normalizeUrlPart(value: string) {
  return value.replace(/\/+$/, "")
}

function resolveLoopLogoUrl() {
  const rawLogo = process.env.NEXT_PUBLIC_LOOP_LOGO_URL?.trim()
  const cloudinaryBase = process.env.CLOUDINARY_BASE_URL?.trim()

  if (rawLogo?.startsWith("http://") || rawLogo?.startsWith("https://")) {
    return rawLogo
  }

  if (rawLogo && cloudinaryBase) {
    const base = normalizeUrlPart(cloudinaryBase)
    const path = rawLogo.replace(/^\/+/, "")
    return `${base}/${path}`
  }

  return fallbackLogoPath
}

export const loop_logo_url = resolveLoopLogoUrl()
