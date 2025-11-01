import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/server/prisma"
import { createSession } from "@/lib/server/auth"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.hashedPassword) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.hashedPassword)
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })
  }

  await createSession(user.id)

  return NextResponse.json({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  })
}
