'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorProfileRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profile#creator')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <p className="text-slate-400 text-sm">Redirecting to the unified profile…</p>
    </div>
  )
}
