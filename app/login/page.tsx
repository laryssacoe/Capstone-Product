'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import styled from "styled-components"

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #e2e8f0;
  padding: 2rem 1rem;
`

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 20px 45px rgba(2, 6, 23, 0.7);
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`

const Subtitle = styled.p`
  color: #94a3b8;
  margin-bottom: 2rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.95rem;
`

const Input = styled.input`
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.95);
  color: #f8fafc;
  &:focus {
    outline: none;
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.15);
  }
`

const Button = styled.button`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  border: none;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const Helper = styled.p`
  margin-top: 1.5rem;
  text-align: center;
  color: #94a3b8;
`

const ErrorText = styled.p`
  color: #fca5a5;
  font-size: 0.9rem;
  margin: -0.5rem 0 0.25rem;
  min-height: 1.2rem;
`

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<{ message: string; code?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  // Get redirect param from search params
  let redirectTo: string | null = null
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    redirectTo = params.get("redirect")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const raw = await response.text()
      let data: { error?: string; code?: string } | null = null
      try {
        data = raw ? (JSON.parse(raw) as { error?: string; code?: string }) : null
      } catch {
        data = null
      }
      if (!response.ok) {
        const message = (data && data.error) || raw || "Unable to sign in."

        if (data?.code === "ACCOUNT_NOT_FOUND") {
          setError({ message, code: data.code })
          return
        }

        if (data?.code === "INVALID_CREDENTIALS") {
          setError({ message })
          return
        }

        if (data?.code === "ACCOUNT_UNUSABLE") {
          setError({ message })
          return
        }

        throw new Error(message)
      }

      setError(null)

      // Redirect to originating page or profile
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.push("/profile")
      }
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in."
      setError({ message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Wrapper>
      <Card>
        <Title>Welcome Back</Title>
        <Subtitle>Sign in to keep building your empathy journey.</Subtitle>

        <Form onSubmit={handleSubmit}>
          <Label>
            Email
            <Input type="email" name="email" placeholder="you@loop.com" required autoComplete="email" />
          </Label>
          <Label>
            Password
            <Input type="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
          </Label>
          <ErrorText role="alert">
            {error ? (
              <>
                {error.message}
                {error.code === "ACCOUNT_NOT_FOUND" && (
                  <>
                    {" "}
                    <Link href="/register">Create an account</Link>.
                  </>
                )}
              </>
            ) : (
              "\u00a0"
            )}
          </ErrorText>
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </Form>

        <Helper>
          New here? <Link href="/register">Create an account</Link>
        </Helper>
      </Card>
    </Wrapper>
  )
}
