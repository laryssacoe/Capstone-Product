import { NextResponse } from "next/server"

import { getCurrentSession } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"

export async function POST() {
  const session = await getCurrentSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role === "CREATOR" || session.user.role === "ADMIN") {
    return NextResponse.json({ message: "Already upgraded." })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role: "CREATOR",
      profile: {
        upsert: {
          update: {
            consentAcceptedAt: new Date(),
          },
          create: {
            consentAcceptedAt: new Date(),
            displayName: session.user.username ?? session.user.email ?? "Creator",
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  })

  return NextResponse.json({ user: updated })
}
