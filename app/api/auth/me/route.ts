import { NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"

export async function GET() {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      creatorProfile: true,
    },
  })

  if (!dbUser) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const creatorProfile = dbUser.creatorProfile
  const creatorStatus = creatorProfile?.status ?? null
  const profileComplete =
    Boolean(creatorProfile?.completedAt) && creatorStatus !== null && creatorStatus !== "SUSPENDED"
  const canSubmitStories = profileComplete && (creatorStatus === "ACTIVE" || creatorStatus === "REVIEW")

  return NextResponse.json({
    user: {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
      isAdmin: dbUser.isAdmin,
      profile: dbUser.profile
        ? {
            displayName: dbUser.profile.displayName,
            avatarUrl: dbUser.profile.avatarUrl,
            bio: dbUser.profile.bio,
            timezone: dbUser.profile.timezone,
            pronouns: dbUser.profile.pronouns,
            location: dbUser.profile.location,
            publicEmail: dbUser.profile.publicEmail,
            websiteUrl: dbUser.profile.websiteUrl,
            linkedinUrl: dbUser.profile.linkedinUrl,
            twitterHandle: dbUser.profile.twitterHandle,
            instagramHandle: dbUser.profile.instagramHandle,
            tiktokHandle: dbUser.profile.tiktokHandle,
            expertiseTags: dbUser.profile.expertiseTags ?? [],
            consentAcceptedAt: dbUser.profile.consentAcceptedAt,
          }
        : null,
      creatorProfile: creatorProfile
        ? {
            id: creatorProfile.id,
            penName: creatorProfile.penName,
            headline: creatorProfile.headline,
            expertiseTags: creatorProfile.expertiseTags ?? [],
            focusAreas: creatorProfile.focusAreas ?? [],
            languages: creatorProfile.languages ?? [],
            tagline: creatorProfile.tagline,
            biography: creatorProfile.biography,
            websiteUrl: creatorProfile.websiteUrl,
            portfolioUrl: creatorProfile.portfolioUrl,
            contactEmail: creatorProfile.contactEmail,
            socialLinks: creatorProfile.socialLinks,
            status: creatorProfile.status,
            completedAt: creatorProfile.completedAt,
            guidelinesAcceptedAt: creatorProfile.guidelinesAcceptedAt,
            termsAcceptedAt: creatorProfile.termsAcceptedAt,
            consentAcceptedAt: creatorProfile.consentAcceptedAt,
          }
        : null,
      permissions: {
        canSubmitStories,
      },
    },
  })
}
