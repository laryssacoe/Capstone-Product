"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import styled, { keyframes } from "styled-components"
import { 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  ChevronRight,
  DollarSign,
  Heart,
  Clock,
  RotateCcw,
} from "lucide-react"

interface StoryMeta {
  id: string
  slug: string
  title: string
  summary?: string | null
}

interface StoryNode {
  id: string
  key: string
  title?: string | null
  type: "NARRATIVE" | "DECISION" | "RESOLUTION"
  content?: {
    text?: string[]
    emotion?: string
    intensity?: number
    next?: string
    choices?: StoryChoice[]
  }
  media?: {
    image?: string
    visual?: string
    audio?: string  
  }
}

interface StoryChoice {
  id: string
  text: string
  leads_to: string
  effects?: {
    money?: number
    health?: number
    mentalHealth?: number
    support?: number
    time?: number
  }
}

interface AvatarProfile {
  name: string
  appearance?: { image?: string }
  initialResources?: {
    money: number
    time: number
    health?: number
    socialSupport?: number
    mentalHealth?: number
    physicalHealth?: number
  }
}

interface GraphResponse {
  story: StoryMeta
  nodes: StoryNode[]
  avatar?: AvatarProfile
}

interface Stats {
  money: number
  health: number
  time: number
}

const fadeIn = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`

const textReveal = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #0f172a;
`

const BackgroundLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
`

const BackgroundImage = styled.div<{ $url: string; $hasImage: boolean }>`
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center top;
  background-image: ${({ $url, $hasImage }) => 
    $hasImage 
      ? `url(${$url})` 
      : `linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #1e1b4b 50%, #0f172a 75%, #1e1b4b 100%)`
  };
  transition: opacity 0.8s ease;
`

const GradientOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(15, 23, 42, 0.15) 0%,
    rgba(15, 23, 42, 0.1) 35%,
    rgba(15, 23, 42, 0.4) 55%,
    rgba(15, 23, 42, 0.85) 75%,
    rgba(15, 23, 42, 0.95) 100%
  );
  pointer-events: none;
`

const TopBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.85), transparent);
  z-index: 20;
`

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: #ffffff; }
`

const TopBarCenter = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 500;
  
  @media (max-width: 768px) {
    display: none;
  }
`

const PreviewTag = styled.span`
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 0.25rem;
  color: #fcd34d;
  font-weight: 600;
  text-transform: uppercase;
`

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const StatsBar = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const StatPill = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.35rem 0.65rem;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  
  svg {
    width: 14px;
    height: 14px;
    color: ${({ $color }) => $color || "#94a3b8"};
  }
`

const AudioButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: rgba(0, 0, 0, 0.45);
  border: none;
  border-radius: 50%;
  color: ${({ $active }) => $active ? "#a78bfa" : "rgba(255,255,255,0.7)"};
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
  
  &:hover {
    background: rgba(139, 92, 246, 0.3);
    color: #a78bfa;
  }
`

const ContentArea = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 0 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  @media (min-width: 768px) {
    padding: 0 2rem 2rem;
  }
`

const TextBox = styled.div<{ $transitioning?: boolean }>`
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 1rem;
  backdrop-filter: blur(20px);
  padding: 1.25rem 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeIn} 0.4s ease-out;
  transition: opacity 0.3s ease;
  opacity: ${({ $transitioning }) => ($transitioning ? 0.7 : 1)};
  box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.5);
  
  @media (min-width: 768px) {
    padding: 1.5rem 2rem;
  }
`

const TextBoxHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 1rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
`

const CharacterAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #8b5cf6;
  flex-shrink: 0;
  box-shadow: 0 4px 12px -4px rgba(139, 92, 246, 0.4);
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const AvatarPlaceholder = styled.span`
  font-size: 1.25rem;
`

const CharacterInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const CharacterName = styled.div`
  color: #c4b5fd;
  font-weight: 600;
  font-size: 1rem;
`

const PassageTitle = styled.div`
  color: #64748b;
  font-size: 0.8rem;
  font-style: italic;
`

const StepBackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.7rem;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(148, 163, 184, 0.22);
    color: #ffffff;
  }
`

const NarrativeText = styled.div`
  color: #e2e8f0;
  font-size: 1rem;
  line-height: 1.8;
  
  p {
    margin-bottom: 0.875rem;
    animation: ${textReveal} 0.5s ease-out;
    &:last-child { margin-bottom: 0; }
  }
  
  @media (min-width: 768px) {
    font-size: 1.05rem;
    line-height: 1.85;
  }
`

const ChoicesContainer = styled.div<{ $visible: boolean }>`
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: ${({ $visible }) => ($visible ? "translateY(0)" : "translateY(15px)")};
  transition: opacity 0.4s ease 0.6s, transform 0.4s ease 0.6s;
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
`

const ChoicesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`

const ChoiceButton = styled.button<{ $index: number; $ready: boolean }>`
  width: 100%;
  padding: 0.875rem 1.125rem;
  background: rgba(51, 65, 85, 0.65);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 0.75rem;
  color: #e2e8f0;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.875rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.3);
  
  opacity: ${({ $ready }) => ($ready ? 1 : 0)};
  transform: ${({ $ready }) => ($ready ? "translateX(0)" : "translateX(-10px)")};
  transition: opacity 0.3s ease, transform 0.3s ease, background 0.2s ease, border-color 0.2s ease;
  transition-delay: ${({ $index, $ready }) => ($ready ? `${0.8 + $index * 0.1}s` : "0s")};
  
  &:hover {
    background: rgba(139, 92, 246, 0.28);
    border-color: rgba(139, 92, 246, 0.65);
    transform: translateX(4px);
  }
`

const ChoiceText = styled.span`
  flex: 1;
`

const ChoiceEffects = styled.div`
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
`

const EffectTag = styled.span<{ $positive: boolean }>`
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
  font-weight: 600;
  background: ${({ $positive }) => ($positive ? "rgba(34, 197, 94, 0.22)" : "rgba(239, 68, 68, 0.22)")};
  color: ${({ $positive }) => ($positive ? "#86efac" : "#fca5a5")};
  border: 1px solid ${({ $positive }) => ($positive ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)")};
  display: flex;
  align-items: center;
  gap: 0.2rem;
  
  svg {
    width: 10px;
    height: 10px;
  }
`

const ContinueButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.75rem;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border: none;
  border-radius: 0.625rem;
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin: 0 auto;
  box-shadow: 0 4px 16px -4px rgba(139, 92, 246, 0.4);
  
  &:hover { 
    transform: scale(1.02);
    box-shadow: 0 8px 24px -8px rgba(139, 92, 246, 0.5);
  }
`

const PreviewBadge = styled.div`
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 0.5rem;
  color: #fcd34d;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 100;
`

const FullScreenBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(to bottom, #0f172a, #1e1b4b);
  color: #e2e8f0;
  text-align: center;
  padding: 2rem;
`

const EndTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #c4b5fd;
`

const EndSubtitle = styled.p`
  color: #94a3b8;
  font-size: 1rem;
  margin-bottom: 2rem;
  max-width: 500px;
`

const FinalStats = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(51, 65, 85, 0.3);
  border-radius: 0.5rem;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`

const RestartButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(51, 65, 85, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 0.75rem;
  color: #94a3b8;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(71, 85, 105, 0.5);
    color: #e2e8f0;
  }
`

const LoadingScreen = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0f1a;
  color: #94a3b8;
`

const ErrorScreen = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0f1a;
  color: #f87171;
  padding: 2rem;
  text-align: center;
  gap: 1.5rem;
`

// Helper to check if a URL is valid media (local or Cloudinary)
const isValidMediaUrl = (url: string | undefined): boolean => {
  if (!url) return false
  return (
    url.startsWith("/scenes/") ||
    url.startsWith("/audio/") ||
    url.includes("cloudinary.com") ||
    url.includes("res.cloudinary.com")
  )
}

// Helper to render effect tags with icons 
const renderEffectTag = (type: 'money' | 'health' | 'time', value: number) => {
  if (value === 0) return null
  
  const isPositive = value > 0
  const prefix = isPositive ? "+" : ""
  
  switch (type) {
    case 'money':
      return (
        <EffectTag key="money" $positive={isPositive}>
          <DollarSign />
          {prefix}{value}
        </EffectTag>
      )
    case 'health':
      return (
        <EffectTag key="health" $positive={isPositive}>
          <Heart />
          {prefix}{value}
        </EffectTag>
      )
    case 'time':
      return (
        <EffectTag key="time" $positive={isPositive}>
          <Clock />
          {prefix}{value}
        </EffectTag>
      )
    default:
      return null
  }
}

export default function CreatorStoryPreviewPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params?.slug
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentAudioSrc = useRef<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [currentKey, setCurrentKey] = useState<string | null>(null)
  const [choicesReady, setChoicesReady] = useState(false)
  const [showChoices, setShowChoices] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [avatarImageError, setAvatarImageError] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [stats, setStats] = useState<Stats>({ money: 100, health: 80, time: 100 })
  const [historyStack, setHistoryStack] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug) return
      setLoading(true)
      setError(null)
      setAvatarImageError(false)
      try {
        const res = await fetch(`/api/stories/${encodeURIComponent(slug)}/graph`, { cache: "no-store" })
        const raw = await res.text()
        const data = raw ? JSON.parse(raw) : null
        if (!res.ok || !data || data.error) {
          throw new Error(data?.error || "Failed to load story graph.")
        }
        if (!cancelled) {
          const g = data as GraphResponse
          setGraph(g)
          const start = g.nodes.find((n) => n.key === "start") ?? g.nodes[0]
          setCurrentKey(start?.key ?? null)
          
          if (g.avatar?.initialResources) {
            const ir = g.avatar.initialResources
            setStats({
              money: ir.money ?? 100,
              time: ir.time ?? 100,
              health: ir.health ?? ir.physicalHealth ?? 80,
            })
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load story graph.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  // Reset choices animation on passage change
  useEffect(() => {
    setShowChoices(false)
    setChoicesReady(false)
    setIsTransitioning(true)
    const timer1 = setTimeout(() => setIsTransitioning(false), 250)
    const timer2 = setTimeout(() => setShowChoices(true), 600)  
    const timer3 = setTimeout(() => setChoicesReady(true), 800) 
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [currentKey])

  const byNodeKey = useMemo(() => {
    const m = new Map<string, StoryNode>()
    if (!graph) return m
    for (const n of graph.nodes) m.set(n.key, n)
    return m
  }, [graph])

  const currentNode = currentKey ? byNodeKey.get(currentKey) : undefined
  const choices = currentNode?.content?.choices ?? []
  const hasChoices = choices.length > 0
  const hasNext = Boolean(currentNode?.content?.next)
  const textContent = currentNode?.content?.text ?? []
  const legacyMedia = (currentNode as any)?.content?.media
  const passageImage =
    currentNode?.media?.image || currentNode?.media?.visual || legacyMedia?.image || legacyMedia?.visual
  const passageAudio = currentNode?.media?.audio || legacyMedia?.audio
  const hasValidImage = isValidMediaUrl(passageImage)
  const hasValidAudio = isValidMediaUrl(passageAudio)

  // Audio playback effect
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (hasValidAudio && audioEnabled && passageAudio) {
      if (currentAudioSrc.current !== passageAudio) {
        audio.src = passageAudio
        audio.loop = true
        audio.volume = 0.5
        currentAudioSrc.current = passageAudio
        
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => console.log("Audio started playing"))
            .catch(err => console.log("Audio autoplay blocked:", err.message))
        }
      } 
    } else {
      // Stop audio if disabled or no valid audio for this node
      if (currentAudioSrc.current) {
        audio.pause()
        audio.currentTime = 0
        currentAudioSrc.current = null
      }
    }
  }, [currentKey, audioEnabled, hasValidAudio, passageAudio])

  // Handle audio toggle
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!audioEnabled && currentAudioSrc.current) {
      audio.pause()
    } else if (audioEnabled && currentAudioSrc.current && passageAudio === currentAudioSrc.current) {
      audio.play().catch(err => console.log("Resume blocked:", err.message))
    }
  }, [audioEnabled, passageAudio])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        currentAudioSrc.current = null
      }
    }
  }, [])

  const getAvatarImage = (): string | null => {
  const imagePath = graph?.avatar?.appearance?.image
  return isValidMediaUrl(imagePath) ? imagePath! : null
}

  const handleChoice = (choice: StoryChoice) => {
    if (choice.effects) {
      setStats(prev => ({
        money: Math.max(0, prev.money + (choice.effects?.money ?? 0)),
        health: Math.max(0, Math.min(100, prev.health + (choice.effects?.health ?? 0))),
        time: Math.max(0, prev.time + (choice.effects?.time ?? 0)),
      }))
    }
    
    if (currentKey) {
      setHistoryStack(prev => [...prev, currentKey])
    }
    
    const targetNode = byNodeKey.get(choice.leads_to)
    if (targetNode) {
      setCurrentKey(targetNode.key)
    } else {
      setCurrentKey(null)
    }
  }

  const handleContinue = () => {
    if (currentNode?.content?.next) {
      if (currentKey) {
        setHistoryStack(prev => [...prev, currentKey])
      }
      const targetNode = byNodeKey.get(currentNode.content.next)
      if (targetNode) {
        setCurrentKey(targetNode.key)
      } else {
        setCurrentKey(null)
      }
    }
  }

  const handleStepBack = () => {
    const previous = historyStack[historyStack.length - 1]
    if (previous) {
      setHistoryStack(prev => prev.slice(0, -1))
      setCurrentKey(previous)
    }
  }

  const handleRestart = () => {
    if (!graph) return
    const start = graph.nodes.find((n) => n.key === "start") ?? graph.nodes[0]
    setCurrentKey(start?.key ?? null)
    setAvatarImageError(false)
    setHistoryStack([])
    
    // Reset audio tracking so it starts fresh
    currentAudioSrc.current = null
    
    if (graph.avatar?.initialResources) {
      const ir = graph.avatar.initialResources
      setStats({
        money: ir.money ?? 100,
        time: ir.time ?? 100,
        health: ir.health ?? ir.physicalHealth ?? 80,
      })
    } else {
      setStats({ money: 100, health: 80, time: 100 })
    }
  }

  const canStepBack = historyStack.length > 0

  if (loading) {
    return (
      <LoadingScreen>
        <p>Loading preview…</p>
      </LoadingScreen>
    )
  }

  if (error || !graph) {
    return (
      <ErrorScreen>
        <p>{error ?? "Unable to load story."}</p>
        <RestartButton onClick={() => router.push("/creator")}>
          <ArrowLeft size={18} />Back to Creator
        </RestartButton>
      </ErrorScreen>
    )
  }

  const avatarImage = getAvatarImage()
  const showAvatarImage = avatarImage && !avatarImageError
  const avatarName = graph.avatar?.name || graph.story.title || "Character"

  // End of story
  if (!currentNode) {
    // Stop audio when story ends
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      currentAudioSrc.current = null
    }
    return (
      <Container>
        <FullScreenBox>
          <EndTitle>Preview Complete</EndTitle>
          <EndSubtitle>You&apos;ve reached the end of this story branch.</EndSubtitle>
          
          <FinalStats>
            <StatPill $color="#60a5fa"><Clock size={14} />{stats.time}h</StatPill>
            <StatPill $color="#4ade80"><DollarSign size={14} />${stats.money}</StatPill>
            <StatPill $color="#f87171"><Heart size={14} />{stats.health}%</StatPill>
          </FinalStats>
          
          <ButtonGroup>
            <RestartButton onClick={handleRestart}>
              <RotateCcw size={18} />Restart Preview
            </RestartButton>
            <ContinueButton onClick={() => router.push("/creator")}>
              Back to Creator<ChevronRight size={18} />
            </ContinueButton>
          </ButtonGroup>
        </FullScreenBox>
        <PreviewBadge>Creator Preview Mode</PreviewBadge>
      </Container>
    )
  }

  return (
    <Container>
      <audio 
        ref={audioRef} 
        preload="auto"
        style={{ display: 'none' }}
      />

      <BackgroundLayer>
        <BackgroundImage $url={passageImage || ""} $hasImage={hasValidImage} />
        <GradientOverlay />
      </BackgroundLayer>
      
      <TopBar>
        <BackButton onClick={() => router.push("/creator")}>
          <ArrowLeft size={16} />Exit Preview
        </BackButton>
        <TopBarCenter>
          <span>{graph.story.title}</span>
          <PreviewTag>Preview</PreviewTag>
        </TopBarCenter>
        <TopBarRight>
          <StatsBar>
            <StatPill $color="#60a5fa"><Clock />{stats.time}h</StatPill>
            <StatPill $color="#4ade80"><DollarSign />${stats.money}</StatPill>
            <StatPill $color="#f87171"><Heart />{stats.health}%</StatPill>
          </StatsBar>
          <AudioButton $active={audioEnabled} onClick={() => setAudioEnabled(!audioEnabled)}>
            {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </AudioButton>
        </TopBarRight>
      </TopBar>
      
      <ContentArea>
        <TextBox key={currentKey} $transitioning={isTransitioning}>
          <TextBoxHeader>
            <CharacterAvatar>
              {showAvatarImage ? (
                <img 
                  src={avatarImage} 
                  alt={avatarName} 
                  onError={() => setAvatarImageError(true)}
                />
              ) : (
                <AvatarPlaceholder>👤</AvatarPlaceholder>
              )}
            </CharacterAvatar>
            <CharacterInfo>
              <CharacterName>{avatarName}</CharacterName>
              {currentNode.title && <PassageTitle>{currentNode.title}</PassageTitle>}
            </CharacterInfo>
            {canStepBack && (
              <StepBackButton onClick={handleStepBack}>
                <ArrowLeft size={14} />Back
              </StepBackButton>
            )}
          </TextBoxHeader>
          <NarrativeText>
            {textContent.map((text, i) => <p key={i}>{text}</p>)}
          </NarrativeText>
        </TextBox>
        
        {hasChoices && showChoices && (
          <ChoicesContainer $visible={choicesReady}>
            <ChoicesGrid>
              {choices.map((choice, index) => (
                <ChoiceButton
                  key={choice.id}
                  $index={index}
                  $ready={choicesReady}
                  onClick={() => handleChoice(choice)}
                >
                  <ChoiceText>{choice.text}</ChoiceText>
                  <ChoiceEffects>
                    {choice.effects?.money !== undefined && renderEffectTag('money', choice.effects.money)}
                    {choice.effects?.health !== undefined && renderEffectTag('health', choice.effects.health)}
                    {choice.effects?.time !== undefined && renderEffectTag('time', choice.effects.time)}
                    {(!choice.effects || (
                      !choice.effects.money && !choice.effects.health && !choice.effects.time
                    )) && <ChevronRight size={16} style={{ color: "#64748b" }} />}
                  </ChoiceEffects>
                </ChoiceButton>
              ))}
            </ChoicesGrid>
          </ChoicesContainer>
        )}

        {hasNext && !hasChoices && (
          <ContinueButton onClick={handleContinue}>
            Continue<ChevronRight size={18} />
          </ContinueButton>
        )}

        {!hasNext && !hasChoices && (
          <div style={{ textAlign: "center" }}>
            <EndSubtitle>End of this branch</EndSubtitle>
            <ButtonGroup>
              <RestartButton onClick={handleRestart}>
                <RotateCcw size={18} />Restart
              </RestartButton>
              <ContinueButton onClick={() => router.push("/creator")}>
                Back to Creator<ChevronRight size={18} />
              </ContinueButton>
            </ButtonGroup>
          </div>
        )}
      </ContentArea>
      
      <PreviewBadge>Creator Preview Mode</PreviewBadge>
    </Container>
  )
}