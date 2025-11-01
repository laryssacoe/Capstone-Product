'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import styled from "styled-components"

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #020617;
  color: #e2e8f0;
  padding: 2rem 1rem;
`

const Card = styled.div`
  width: 100%;
  max-width: 460px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 25px 45px rgba(2, 6, 23, 0.65);
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
    border-color: #a855f7;
    box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.15);
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
  background: linear-gradient(135deg, #7c3aed, #2563eb);
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

const FieldError = styled.span`
  color: #fca5a5;
  font-size: 0.8rem;
  line-height: 1.1rem;
  min-height: 1.1rem;
`

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email: string; username: string }>({ email: "", username: "" })
  const [form, setForm] = useState({ email: "", username: "", password: "" })
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")

  useEffect(() => {
    const normalized = form.email.trim().toLowerCase()
    if (!normalized || !emailPattern.test(normalized)) {
      setEmailStatus("idle")
      return
    }

    let cancelled = false
    const controller = new AbortController()

    setEmailStatus("checking")

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(normalized)}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          if (!cancelled) {
            setEmailStatus("idle")
          }
          return
        }

        const data = (await response.json()) as { exists: boolean }
        if (!cancelled) {
          setEmailStatus(data.exists ? "taken" : "available")
        }
      } catch (error) {
        if (!cancelled && (error as Error).name !== "AbortError") {
          setEmailStatus("idle")
        }
      }
    }, 350)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [form.email])

  const handleInputChange = (field: "email" | "username" | "password") => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setForm((prev) => ({ ...prev, [field]: value }))

    if (field === "email") {
      setFieldErrors((prev) => ({ ...prev, email: "" }))
      setEmailStatus("idle")
    }

    if (field === "username") {
      setFieldErrors((prev) => ({ ...prev, username: "" }))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = form.email.trim().toLowerCase()
    const normalizedUsername = form.username.trim()

    if (!emailPattern.test(normalizedEmail)) {
      setFieldErrors({ email: "Please enter a valid email address.", username: "" })
      setEmailStatus("idle")
      setError("")
      return
    }

    if (!normalizedUsername) {
      setFieldErrors({ email: "", username: "Username is required." })
      setError("")
      return
    }

    if (emailStatus === "taken") {
      setFieldErrors({ email: "This email is already in use. Please try a different email or Sign in.", username: "" })
      setError("")
      return
    }

    setLoading(true)
    setError("")
    setFieldErrors({ email: "", username: "" })

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, username: normalizedUsername, password: form.password }),
      })

      const raw = await response.text()
      let data: { error?: string; fields?: string[] } | null = null
      try {
        data = raw ? (JSON.parse(raw) as { error?: string; fields?: string[] }) : null
      } catch {
        data = null
      }
      if (!response.ok) {
        let message = "Unable to create account."

        if (data?.error) {
          // handle both string and structured Zod errors
          if (typeof data.error === "string") {
            message = data.error
          } else if (typeof data.error === "object") {
            // flatten zod formatted error messages
            message = Object.values(data.error)
              .flat()
              .join(", ")
          }
        } else if (raw) {
          message = raw
        }

        if (response.status === 409) {
          const fields = Array.isArray(data?.fields) ? data?.fields ?? [] : []
          const emailConflict = fields.includes("email") || /email/i.test(message)
          const usernameConflict = fields.includes("username") || /username/i.test(message)
          setFieldErrors({
            email: emailConflict ? "This email is already in use. Please try a different email or Sign in." : "",
            username: usernameConflict ? "This username is already taken." : "",
          })
          if (emailConflict) {
            setEmailStatus("taken")
          }
          setError(emailConflict || usernameConflict ? "" : message)
          return
        }

        if (response.status === 400 && /email/i.test(message)) {
          setFieldErrors({ email: message, username: "" })
          setEmailStatus("idle")
          setError("")
          return
        }

        throw new Error(message)
      }

      router.push("/progress")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.")
    } finally {
      setLoading(false)
    }
  }

  const emailAvailabilityMessage =
    emailStatus === "checking"
      ? "Checking email availability..."
      : emailStatus === "taken"
        ? "This email is already in use. Please try a different email or Sign in."
        : ""

  const emailFieldMessage = fieldErrors.email || emailAvailabilityMessage

  return (
    <Wrapper>
      <Card>
        <Title>Create your Loop account</Title>
        <Subtitle>Save your empathy journey, achievements, and creator content.</Subtitle>

        <Form onSubmit={handleSubmit}>
          <Label>
            Email
            <Input
              type="email"
              name="email"
              placeholder="you@loop.com"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleInputChange("email")}
            />
            <FieldError aria-live="polite">{emailFieldMessage || "\u00a0"}</FieldError>
          </Label>
          <Label>
            Username
            <Input
              type="text"
              name="username"
              placeholder="loop-explorer"
              required
              autoComplete="username"
              value={form.username}
              onChange={handleInputChange("username")}
            />
            <FieldError aria-live="polite">{fieldErrors.username || "\u00a0"}</FieldError>
          </Label>
          <Label>
            Password
            <Input
              type="password"
              name="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={handleInputChange("password")}
            />
          </Label>
          <ErrorText>{error || "\u00a0"}</ErrorText>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </Form>

        <Helper>
          Already have an account? <Link href="/login">Sign in</Link>
        </Helper>
      </Card>
    </Wrapper>
  )
}
