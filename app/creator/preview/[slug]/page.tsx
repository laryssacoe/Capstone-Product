 "use client"

import { useEffect, useMemo, useState, useRef, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Home, Volume2, VolumeX, Play, Pause } from "lucide-react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useRef as useThreeRef } from "react"
import * as THREE from "three"

interface StoryMeta {
  id: string
  slug: string
  title: string
  summary?: string | null
  tags: string[]
  visibility: string
  createdAt: string
  updatedAt: string
}

interface StoryNode {
  id: string
  storyId: string
  key: string
  title?: string | null
  synopsis?: string | null
  type: "NARRATIVE" | "DECISION" | "RESOLUTION"
  content?: any
  media?: any
}

interface StoryPath {
  id: string
  storyId: string
  key: string
  label: string
  summary?: string | null
  metadata?: any
}

interface StoryTransition {
  id: string
  storyId: string
  fromNodeId: string
  pathId: string
  toNodeId?: string | null
  ordering?: number | null
  condition?: any
  effect?: any
}

interface GraphResponse {
  story: StoryMeta
  nodes: StoryNode[]
  paths: StoryPath[]
  transitions: StoryTransition[]
}

function EmotionalParticles({ emotion }: { emotion: string }) {
  const meshRef = useThreeRef<THREE.InstancedMesh>(null)
  const count = 80

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const emotionData = {
      fear: { color: [1, 0.1, 0.1], movement: "erratic", size: 0.8 },
      hope: { color: [0.2, 0.7, 1], movement: "upward", size: 1.2 },
      sadness: { color: [0.3, 0.3, 0.9], movement: "downward", size: 0.6 },
      anger: { color: [1, 0.3, 0], movement: "aggressive", size: 1.4 },
      peace: { color: [0.2, 1, 0.4], movement: "gentle", size: 1.0 },
      anxiety: { color: [1, 1, 0.1], movement: "jittery", size: 0.9 },
      neutral: { color: [0.7, 0.7, 0.7], movement: "calm", size: 1.0 },
    }

    const data = emotionData[emotion as keyof typeof emotionData] || emotionData.neutral
    const [r, g, b] = data.color

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12
      positions[i * 3 + 1] = Math.random() * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12

      colors[i * 3] = r + Math.random() * 0.3 - 0.15
      colors[i * 3 + 1] = g + Math.random() * 0.3 - 0.15
      colors[i * 3 + 2] = b + Math.random() * 0.3 - 0.15

      sizes[i] = data.size * (0.7 + Math.random() * 0.6)
    }
    return { positions, colors, sizes }
  }, [emotion])

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime()

      for (let i = 0; i < count; i++) {
        const matrix = new THREE.Matrix4()
        let x = positions[i * 3]
        let y = positions[i * 3 + 1]
        let z = positions[i * 3 + 2]

        switch (emotion) {
          case "fear":
            x += Math.sin(time * 3 + i) * 3
            y += Math.cos(time * 2.5 + i) * 2
            break
          case "anxiety":
            x += Math.sin(time * 4 + i) * 1.5
            y += Math.sin(time * 3.5 + i) * 1.5
            break
          case "anger":
            x += Math.sin(time * 2 + i) * 4
            z += Math.cos(time * 1.8 + i) * 3
            break
          case "sadness":
            y += Math.sin(time * 0.5 + i) * 0.5 - 0.5
            break
          case "hope":
            y += Math.sin(time * 0.8 + i) * 1 + 0.5
            break
          default:
            x += Math.sin(time * 0.5 + i) * 2
            y += Math.sin(time * 0.3 + i) * 1
        }

        const scale = sizes[i] * (0.8 + Math.sin(time * 2 + i) * 0.4)
        matrix.setPosition(x, y, z)
        matrix.multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
        meshRef.current.setMatrixAt(i, matrix)
      }
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.06]} />
      <meshBasicMaterial transparent opacity={0.7} />
    </instancedMesh>
  )
}

function EmotionalAtmosphere({ emotion, intensity }: { emotion: string; intensity: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <ambientLight intensity={0.1} />
        <directionalLight position={[10, 10, 5]} intensity={0.2} />
        <Suspense fallback={null}>
          <EmotionalParticles emotion={emotion} />
        </Suspense>
      </Canvas>

      <div
        className={`absolute inset-0 transition-all duration-2000 ${
          emotion === "fear"
            ? "bg-red-900/10"
            : emotion === "hope"
              ? "bg-blue-900/10"
              : emotion === "sadness"
                ? "bg-indigo-900/15"
                : emotion === "anger"
                  ? "bg-orange-900/10"
                  : emotion === "peace"
                    ? "bg-green-900/10"
                    : emotion === "anxiety"
                      ? "bg-yellow-900/10"
                      : "bg-slate-900/5"
        }`}
        style={{ opacity: intensity }}
      />
    </div>
  )
}

export default function CreatorStoryPreviewPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params?.slug

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [currentKey, setCurrentKey] = useState<string | null>(null)

  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral")
  const [emotionalIntensity, setEmotionalIntensity] = useState<number>(0.3)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/stories/${encodeURIComponent(slug)}/graph`, { cache: "no-store" })
        const raw = await res.text()
        const data = raw ? (JSON.parse(raw) as GraphResponse | { error: string }) : null
        if (!res.ok || !data || (data as any).error) {
          throw new Error((data as any)?.error || raw || "Failed to load story graph.")
        }
        if (!cancelled) {
          const g = data as GraphResponse
          setGraph(g)
          const start = g.nodes.find((n) => n.key === "start") ?? g.nodes[0]
          setCurrentKey(start?.key ?? null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load story graph.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const byNodeId = useMemo(() => {
    const m = new Map<string, StoryNode>()
    if (!graph) return m
    for (const n of graph.nodes) m.set(n.id, n)
    return m
  }, [graph])

  const byNodeKey = useMemo(() => {
    const m = new Map<string, StoryNode>()
    if (!graph) return m
    for (const n of graph.nodes) m.set(n.key, n)
    return m
  }, [graph])

  const pathLabelById = useMemo(() => {
    const m = new Map<string, string>()
    if (!graph) return m
    for (const p of graph.paths) m.set(p.id, p.label)
    return m
  }, [graph])

  const outgoingByNodeId = useMemo(() => {
    const m = new Map<string, (StoryTransition & { label: string })[]>()
    if (!graph) return m
    for (const t of graph.transitions) {
      const label = pathLabelById.get(t.pathId) ?? t.pathId
      const arr = m.get(t.fromNodeId) ?? []
      arr.push({ ...t, label })
      m.set(t.fromNodeId, arr)
    }
    for (const [key, arr] of m) {
      arr.sort((a, b) => {
        const ao = a.ordering ?? 0
        const bo = b.ordering ?? 0
        if (ao !== bo) return ao - bo
        return a.label.localeCompare(b.label)
      })
      m.set(key, arr)
    }
    return m
  }, [graph, pathLabelById])

  const currentNode = currentKey ? byNodeKey.get(currentKey) : undefined
  const outgoing = currentNode ? (outgoingByNodeId.get(currentNode.id) ?? []) : []

  useEffect(() => {
    if (currentNode?.media) {
      const emotion = currentNode.media.emotion || "neutral"
      const intensity = currentNode.media.intensity || 0.3

      setCurrentEmotion(emotion)
      setEmotionalIntensity(intensity)
    }
  }, [currentNode])

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) {
      return () => {}
    }

    let timer: ReturnType<typeof setTimeout> | null = null

    if (currentNode?.media?.audio) {
      audioElement.pause()
      setIsAudioPlaying(false)

      timer = setTimeout(() => {
        audioElement.src = `/placeholder.svg?height=1&width=1&query=ambient-${currentNode.key}`
        audioElement.volume = 0.3
        audioElement.load()
      }, 100)
    } else {
      audioElement.pause()
      setIsAudioPlaying(false)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
      audioElement.pause()
      setIsAudioPlaying(false)
    }
  }, [currentNode])

  const toggleAudio = async () => {
    if (audioRef.current) {
      try {
        if (isAudioPlaying) {
          audioRef.current.pause()
          setIsAudioPlaying(false)
        } else {
          if (audioRef.current.readyState >= 2) {
            await audioRef.current.play()
            setIsAudioPlaying(true)
          }
        }
      } catch (error) {
        console.log("[v0] Audio play failed:", error)
        setIsAudioPlaying(false)
      }
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const goTo = (nextNodeId?: string | null) => {
    if (!graph) return
    if (!nextNodeId) {
      setCurrentKey(null)
      return
    }

    setEmotionalIntensity(0.8)
    if (audioRef.current) {
      audioRef.current.pause()
      setIsAudioPlaying(false)
    }

    setTimeout(() => {
      const nextNode = byNodeId.get(nextNodeId)
      setCurrentKey(nextNode?.key ?? null)
      setEmotionalIntensity(0.3)
    }, 500)
  }

  const restart = () => {
    if (!graph) return
    const start = graph.nodes.find((n) => n.key === "start") ?? graph.nodes[0]
    setCurrentKey(start?.key ?? null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-3 w-3 bg-pink-400 mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading preview…</p>
        </div>
      </div>
    )
  }

  if (error || !graph) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              Loop
            </Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
          <p className="text-red-400">{error ?? "Unable to load story."}</p>
          <Button variant="outline" onClick={() => router.push("/creator")}>
            Back to Creator
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 relative overflow-hidden flex flex-col">
      <EmotionalAtmosphere emotion={currentEmotion} intensity={emotionalIntensity} />

      {currentNode?.media?.audio && (
        <audio
          ref={audioRef}
          loop
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onError={(e) => {
            console.log("[v0] Audio error:", e)
            setIsAudioPlaying(false)
          }}
          className="hidden"
        >
          <source src={`/placeholder.svg?height=1&width=1&query=ambient-${currentNode.key}`} type="audio/mpeg" />
        </audio>
      )}

      <div className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/creator")}
              className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Creator
            </Button>
            <h1 className="text-xl font-semibold text-slate-100">{graph.story.title} (Preview)</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-slate-500 mr-2">Audio:</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAudio}
              className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 w-8 h-8 p-0"
            >
              {isAudioPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 w-8 h-8 p-0"
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-4xl">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm relative">
            <div
              className={`absolute inset-0 rounded-lg transition-all duration-1000 ${
                currentEmotion === "fear"
                  ? "shadow-lg shadow-red-500/20"
                  : currentEmotion === "hope"
                    ? "shadow-lg shadow-blue-500/20"
                    : currentEmotion === "sadness"
                      ? "shadow-lg shadow-indigo-500/20"
                      : currentEmotion === "anger"
                        ? "shadow-lg shadow-orange-500/20"
                        : currentEmotion === "peace"
                          ? "shadow-lg shadow-green-500/20"
                          : currentEmotion === "anxiety"
                            ? "shadow-lg shadow-yellow-500/20"
                            : "shadow-lg shadow-slate-500/10"
              }`}
              style={{ opacity: emotionalIntensity }}
            />

            <CardContent className="p-8 relative">
              {currentNode ? (
                <div className="space-y-6">
                  {currentNode.media?.audio && (
                    <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/50 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-500 font-medium text-xs mb-1">Audio & Emotional Context</p>
                          <p className="text-slate-400 text-sm">{currentNode.media.audio}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-slate-500">
                              Emotion: <span className="capitalize text-slate-400">{currentEmotion}</span>
                            </span>
                            <span className="text-xs text-slate-500">
                              Intensity: <span className="text-slate-400">{Math.round(emotionalIntensity * 100)}%</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${isAudioPlaying ? "bg-green-400 animate-pulse" : "bg-slate-600"}`}
                          />
                          <span className="text-xs text-slate-500">{isAudioPlaying ? "On" : "Off"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentNode.title && <h3 className="text-2xl font-semibold text-white mb-4">{currentNode.title}</h3>}

                  {currentNode.content?.text && Array.isArray(currentNode.content.text) && (
                    <div className="space-y-6 mb-8">
                      {currentNode.content.text.map((t: any, i: number) => (
                        <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.3}s` }}>
                          <p className="text-lg text-slate-200 leading-relaxed text-pretty font-light">{String(t)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col space-y-4">
                    {currentNode.type === "DECISION" && (
                      <>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-8 h-px bg-pink-500" />
                          <h3 className="text-lg font-semibold text-slate-100">What do you choose?</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-pink-500/50 to-transparent" />
                        </div>
                        {(outgoing?.length ?? 0) === 0 && <div className="text-slate-400">No choices configured.</div>}
                        {outgoing.map((t, index) => (
                          <Button
                            key={t.id}
                            onClick={() => goTo(t.toNodeId)}
                            variant="outline"
                            className="bg-slate-700/30 border-slate-600 text-slate-100 hover:bg-slate-600/50 hover:border-pink-500/50 p-6 h-auto text-left justify-start transition-all duration-300 group"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="w-6 h-6 rounded-full bg-slate-600 group-hover:bg-pink-500/20 flex items-center justify-center text-xs font-medium mt-1">
                                {index + 1}
                              </div>
                              <span className="text-pretty leading-relaxed">{t.label}</span>
                            </div>
                          </Button>
                        ))}
                      </>
                    )}

                    {currentNode.type !== "DECISION" && (
                      <div className="text-center">
                        {outgoing.length === 0 ? (
                          <Button
                            onClick={restart}
                            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-8 py-3"
                          >
                            Restart Story
                          </Button>
                        ) : outgoing.length === 1 ? (
                          <Button
                            onClick={() => goTo(outgoing[0].toNodeId)}
                            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-medium"
                          >
                            Continue Journey
                          </Button>
                        ) : (
                          <div className="flex flex-wrap gap-3 justify-center">
                            {outgoing.map((t) => (
                              <Button
                                key={t.id}
                                variant="secondary"
                                onClick={() => goTo(t.toNodeId)}
                                className="bg-slate-700 hover:bg-slate-600 text-white"
                              >
                                {t.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-8">
                  <div className="mb-6">
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent mx-auto mb-4" />
                    <p className="text-slate-300 text-lg mb-2">Preview Complete</p>
                    <p className="text-slate-400 text-sm">End of story preview.</p>
                  </div>
                  <div className="space-x-4">
                    <Button
                      onClick={restart}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
                    >
                      Restart
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/creator")}>
                      Back to Creator
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
