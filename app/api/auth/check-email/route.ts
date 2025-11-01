import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/server/prisma"

const querySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please provide a valid email address.")
    .transform((value) => value.toLowerCase()),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get("email") ?? ""

  const parsed = querySchema.safeParse({ email })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid email address."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  })

  return NextResponse.json({ exists: Boolean(existing) })
}
