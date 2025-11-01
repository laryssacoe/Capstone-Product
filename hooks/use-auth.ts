import { useCallback, useEffect, useState } from "react"

interface UserProfileSummary {
  displayName?: string | null
  avatarUrl?: string | null
  bio?: string | null
  timezone?: string | null
  pronouns?: string | null
  location?: string | null
  publicEmail?: string | null
  websiteUrl?: string | null
  linkedinUrl?: string | null
  twitterHandle?: string | null
  instagramHandle?: string | null
  tiktokHandle?: string | null
  expertiseTags: string[]
  consentAcceptedAt?: string | null
}

type CreatorProfileStatus = "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED"

interface CreatorProfileSummary {
  id: string
  penName?: string | null
  headline?: string | null
  expertiseTags: string[]
  focusAreas: string[]
  languages: string[]
  tagline?: string | null
  biography?: string | null
  websiteUrl?: string | null
  portfolioUrl?: string | null
  contactEmail?: string | null
  socialLinks?: unknown
  status: CreatorProfileStatus
  completedAt?: string | null
  guidelinesAcceptedAt?: string | null
  termsAcceptedAt?: string | null
  consentAcceptedAt?: string | null
}

interface AuthenticatedUser {
  id: string
  email: string | null
  username: string | null
  role: string
  isAdmin: boolean
  profile: UserProfileSummary | null
  creatorProfile: CreatorProfileSummary | null
  permissions: {
    canSubmitStories: boolean
  }
}

interface AuthState {
  user: AuthenticatedUser | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Failed to load user")
      }
      const data = await response.json()
      setState({ user: data.user, loading: false })
    } catch {
      setState({ user: null, loading: false })
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { ...state, refresh: fetchUser }
}
