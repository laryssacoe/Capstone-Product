import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import { prisma } from "./prisma"

const SESSION_COOKIE = "loop_session"
const SESSION_MAX_AGE_DAYS = 7

function calculateExpiry() {
  return new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
}

function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  })
}

export async function createSession(userId: string) {
  const token = randomUUID()
  const expiresAt = calculateExpiry()

  await prisma.userSession.create({
    data: {
      token,
      userId,
      kind: "AUTHENTICATED",
      expiresAt,
    },
  })

  setSessionCookie(token, expiresAt)
}

export async function deleteSession(token?: string) {
  const sessionToken = token ?? cookies().get(SESSION_COOKIE)?.value
  if (!sessionToken) return

  await prisma.userSession.deleteMany({
    where: { token: sessionToken },
  })

  cookies().delete(SESSION_COOKIE)
}

export async function getCurrentSession() {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.userSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) {
    cookies().delete(SESSION_COOKIE)
    return null
  }

  if (session.expiresAt && session.expiresAt < new Date()) {
    await deleteSession(token)
    return null
  }

  return session
}

async function createGuestSession() {
  const token = randomUUID()
  const expiresAt = calculateExpiry()

  const session = await prisma.userSession.create({
    data: {
      token,
      kind: "GUEST",
      expiresAt,
    },
  })

  setSessionCookie(token, expiresAt)
  return session
}

export async function getOrCreateSession() {
  const current = await getCurrentSession()
  if (current) return current
  return createGuestSession()
}
