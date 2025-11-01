'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type ReviewPageProps = {
  searchParams: {
    versionId?: string
    token?: string
    storyCode?: string
    slug?: string
  }
}

interface ReviewResponse {
  version: {
    id: string
    status: string
    versionNumber: number
    ownershipStatus: string
    submittedAt: string | null
    reviewedAt: string | null
    changelog?: string | null
    consentSnapshot?: unknown
    metadata?: Record<string, unknown>
    content: any
  }
  story: {
    id: string
    slug: string
    title: string
    summary?: string | null
    tags: string[]
    visibility: string
    creditText?: string | null
    ownershipStatus: string
    submittedAt: string | null
    transferConsentAt?: string | null
    transferConsentIp?: string | null
    transferConsentUserAgent?: string | null
    originalCreator?: { id: string; username: string | null; email: string | null } | null
    originalCreatorProfile?: {
      id: string
      penName?: string | null
      headline?: string | null
      biography?: string | null
      status: string
      contactEmail?: string | null
      portfolioUrl?: string | null
    } | null
    owner?: { id: string; username: string | null; email: string | null } | null
  }
  author: { id: string; username: string | null; email: string | null } | null
  permissions: { canModerate: boolean }
}

export default function AdminReviewPage({ searchParams }: ReviewPageProps) {
  const router = useRouter()
  const versionId = searchParams.versionId ?? ''
  const token = searchParams.token
  const storyCodeParam = searchParams.storyCode ?? searchParams.slug ?? null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReviewResponse | null>(null)
  const [notes, setNotes] = useState('')
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!versionId) {
        setError('Missing version id. Check the review link you received.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : ''
        const response = await fetch(`/api/review/version/${encodeURIComponent(versionId)}${query}`, {
          cache: 'no-store',
        })
        const raw = await response.text()
        const payload = raw ? JSON.parse(raw) : null
        if (!response.ok) {
          throw new Error((payload && payload.error) || raw || 'Unable to load submission.')
        }
        if (active) {
          setData(payload as ReviewResponse)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load submission.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [token, versionId])

  const content = useMemo(() => {
    const c = data?.version?.content
    if (!c || typeof c !== 'object') return null
    return c as { nodes?: any[]; paths?: any[]; transitions?: any[]; story?: any }
  }, [data])

  const canModerate = data?.permissions?.canModerate ?? false
  const previewStoryCode = data?.story.slug ?? storyCodeParam

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!versionId) return
    setSubmitting(decision)
    setActionStatus(null)
    try {
      const response = await fetch('/api/creator/stories/publish/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          decision,
          notes: notes.trim() ? notes.trim() : undefined,
          token,
        }),
      })

      const raw = await response.text()
      const payload = raw ? JSON.parse(raw) : null
      if (!response.ok) {
        throw new Error((payload && payload.error) || raw || 'Unable to submit decision.')
      }

      setActionStatus(
        decision === 'approve'
          ? `Story approved at ${new Date(payload.reviewedAt).toLocaleString()}.`
          : `Story rejected at ${new Date(payload.reviewedAt).toLocaleString()}.`,
      )
      // Reload submission data to reflect new status
      router.refresh()
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Unable to submit decision.')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto" />
          <p className="text-sm text-slate-400">Preparing review workspace…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center px-6">
        <Card className="max-w-lg bg-slate-900/80 border border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Review unavailable</CardTitle>
            <CardDescription className="text-slate-400">
              {error ?? 'We could not load the requested submission.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="mt-2">
              <Link href="/">Return home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const nodeCount = content?.nodes?.length ?? 0
  const pathCount = content?.paths?.length ?? 0
  const transitionCount = content?.transitions?.length ?? 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-2xl font-semibold text-white">
              Loop Review
            </Link>
            <p className="text-xs text-slate-500">Story moderation dashboard</p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            <div>Version: {data.version.versionNumber}</div>
            {token && <div className="text-amber-300">Token review link</div>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <Card className="bg-slate-900/80 border border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-2xl">{data.story.title}</CardTitle>
            <CardDescription className="text-slate-400">
              {data.story.summary || 'No summary provided.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            {previewStoryCode && (
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 font-mono text-xs uppercase tracking-wide text-violet-200">
                <span>Story code</span>
                <span className="text-white">{previewStoryCode}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-blue-500/10 border border-blue-500/40 px-3 py-1 text-xs uppercase tracking-wide text-blue-200">
                {data.story.visibility.toLowerCase()}
              </span>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs text-purple-200">
                Ownership: {data.story.ownershipStatus}
              </span>
              {data.story.tags?.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Nodes</p>
                <p className="text-lg font-semibold text-white">{nodeCount}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Paths</p>
                <p className="text-lg font-semibold text-white">{pathCount}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Transitions</p>
                <p className="text-lg font-semibold text-white">{transitionCount}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-white">Creator credit</h3>
                <p className="text-slate-300 text-sm">
                  {data.story.creditText ?? 'Credit will display once approved.'}
                </p>
                {data.story.originalCreatorProfile && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Pen name: {data.story.originalCreatorProfile.penName ?? '—'}</div>
                    <div>Headline: {data.story.originalCreatorProfile.headline ?? '—'}</div>
                    <div>Status: {data.story.originalCreatorProfile.status}</div>
                    {data.story.originalCreatorProfile.contactEmail && (
                      <div>Contact: {data.story.originalCreatorProfile.contactEmail}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-white">Submission metadata</h3>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Submitted: {data.story.submittedAt ? new Date(data.story.submittedAt).toLocaleString() : '—'}</div>
                  <div>Submitter: {data.author?.username ?? data.author?.email ?? 'Unknown'}</div>
                  {data.story.transferConsentAt && (
                    <div>Consent logged: {new Date(data.story.transferConsentAt).toLocaleString()}</div>
                  )}
                  {data.story.transferConsentIp && <div>IP: {data.story.transferConsentIp}</div>}
                  {data.story.transferConsentUserAgent && (
                    <div className="truncate">Agent: {data.story.transferConsentUserAgent}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Story outline</h3>
              {content?.nodes && content.nodes.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {content.nodes.map((node: any) => (
                    <div key={node.key} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{node.key}</span>
                        <span>{node.type}</span>
                      </div>
                      <p className="text-sm font-medium text-white mt-1">{node.title ?? 'Untitled node'}</p>
                      {Array.isArray(node.content?.text) && node.content.text.length > 0 && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-3">{node.content.text[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No node details available in this version snapshot.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Decision</CardTitle>
            <CardDescription className="text-slate-400">
              Share optional reviewer notes—these go to the creator if they need revisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canModerate && (
              <p className="text-sm text-amber-300">
                You are viewing this story without moderation privileges. Sign in as an admin or use the secure link
                from your email to approve or reject the submission.
              </p>
            )}

            <Textarea
              placeholder="Notes for the creator (optional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-200"
              rows={4}
              disabled={!canModerate}
            />

            {actionStatus && (
              <p className="text-sm text-slate-300 border border-slate-700 rounded-lg px-4 py-2 bg-slate-950/40">
                {actionStatus}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!canModerate || submitting !== null}
                onClick={() => handleDecision('approve')}
              >
                {submitting === 'approve' ? 'Approving…' : 'Approve'}
              </Button>
              <Button
                variant="destructive"
                disabled={!canModerate || submitting !== null}
                onClick={() => handleDecision('reject')}
              >
                {submitting === 'reject' ? 'Rejecting…' : 'Reject'}
              </Button>
              {previewStoryCode && (
                <Button asChild variant="secondary">
                  <Link href={`/creator/preview/${encodeURIComponent(previewStoryCode)}`}>
                    Open creator preview
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
