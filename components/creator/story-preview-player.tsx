"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import styled, { keyframes } from "styled-components"
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Heart,
  RotateCcw,
  Users,
  User,
  Volume2,
  VolumeX,
} from "lucide-react"
import OptimizedStoryImage from "@/components/optimized-story-image"

export interface ResearchSource {
  id: string
  citation: string
  usedFor?: string[]
}

export interface StoryMeta {
  id?: string
  slug?: string
  title: string
  summary?: string | null
  tags?: string[]
  researchSources?: ResearchSource[]
}

export interface StoryChoice {
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

export interface StoryNode {
  id?: string
  key: string
  title?: string | null
  type?: "NARRATIVE" | "DECISION" | "RESOLUTION"
  content?: {
    text?: string[] | string
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

export interface AvatarProfile {
  name: string
  appearance?: { image?: string }
  initialResources?: {
    money: number
    time: number
    health?: number
    support?: number
    socialSupport?: number
    mentalHealth?: number
    physicalHealth?: number
  }
}

export interface GraphInitialResources {
  money?: number
  time?: number
  health?: number
  socialSupport?: number
  support?: number
  physicalHealth?: number
}

export interface PreviewGraph {
  story: StoryMeta
  nodes: StoryNode[]
  avatar?: AvatarProfile
  initialResources?: GraphInitialResources
}

interface StoryPreviewPlayerProps {
  graph: PreviewGraph
  onExit?: () => void
  exitLabel?: string
  badgeLabel?: string
  embedded?: boolean
}

interface StoryPreviewErrorProps {
  message: string
  onExit?: () => void
  exitLabel?: string
  embedded?: boolean
}

interface Stats {
  money: number
  health: number
  time: number
  support: number
}

type PersistedRun = {
  storyKey: string
  runId: string
  nodeCount: number
  currentKey: string | null
  stats: Stats
  historyStack: string[]
  initialResourceSignature?: string
  updatedAt: number
}

const slugifyKey = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")

const buildStoryStorageKey = (story: StoryMeta) => {
  const base = story.slug || story.id || story.title || "story"
  return `loop:preview:${slugifyKey(String(base))}`
}

const createRunId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const defaultStats: Stats = { money: 500, health: 100, time: 100, support: 0 }

const buildInitialStats = (graph: PreviewGraph): Stats => {
  const base = graph.initialResources ?? graph.avatar?.initialResources
  if (!base) return defaultStats
  const money = typeof base.money === "number" ? base.money : defaultStats.money
  const time = typeof base.time === "number" ? base.time : defaultStats.time
  const health =
    typeof base.health === "number"
      ? base.health
      : typeof base.physicalHealth === "number"
        ? base.physicalHealth
        : defaultStats.health
  const support =
    typeof base.support === "number"
      ? base.support
      : typeof base.socialSupport === "number"
        ? base.socialSupport
        : defaultStats.support

  return { money, time, health, support }
}

const buildInitialResourceSignature = (graph: PreviewGraph) => {
  const base = graph.initialResources ?? graph.avatar?.initialResources
  if (!base) return ""
  const normalized = {
    money: typeof base.money === "number" ? base.money : undefined,
    time: typeof base.time === "number" ? base.time : undefined,
    health:
      typeof base.health === "number"
        ? base.health
        : typeof base.physicalHealth === "number"
          ? base.physicalHealth
          : undefined,
    support:
      typeof base.support === "number"
        ? base.support
        : typeof base.socialSupport === "number"
          ? base.socialSupport
          : undefined,
  }
  return JSON.stringify(normalized)
}

const fadeIn = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`

const textReveal = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`

const criticalPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(248, 113, 113, 0.0); }
  50% { box-shadow: 0 0 0 6px rgba(248, 113, 113, 0.18); }
`

const Container = styled.div<{ $embedded?: boolean }>`
  position: relative;
  width: 100%;
  height: ${({ $embedded }) => ($embedded ? "100%" : "100vh")};
  overflow: hidden;
  background: #0f172a;

  @media (max-width: 768px) {
    height: ${({ $embedded }) => ($embedded ? "100%" : "auto")};
    min-height: ${({ $embedded }) => ($embedded ? "100%" : "100dvh")};
    overflow-x: hidden;
    overflow-y: auto;
  }
`

const HiddenAudio = styled.audio`
  display: none;
`

const BackgroundLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
`

const BackgroundImage = styled.div<{ $url: string; $hasImage: boolean; $loaded?: boolean; $blurred?: boolean }>`
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center top;
  background-image: ${({ $url, $hasImage }) =>
    $hasImage
      ? `url(${$url})`
      : `linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #1e1b4b 50%, #0f172a 75%, #1e1b4b 100%)`};
  transition: opacity 0.8s ease;
  opacity: ${({ $loaded }) => ($loaded === undefined ? 1 : $loaded ? 1 : 0)};
  filter: ${({ $blurred }) => ($blurred ? "blur(18px)" : "none")};
  transform: ${({ $blurred }) => ($blurred ? "scale(1.05)" : "scale(1)")};
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

  @media (max-width: 768px) {
    position: sticky;
    top: 0;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(10px);
  }
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
  &:hover {
    color: #ffffff;
  }
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

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    gap: 0.5rem;
  }
`

const StatsBar = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
`

const StatPill = styled.div<{ $color?: string; $critical?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: ${({ $critical }) => ($critical ? "#fee2e2" : "#ffffff")};
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.35rem 0.65rem;
  background: ${({ $critical }) => ($critical ? "rgba(127, 29, 29, 0.45)" : "rgba(0, 0, 0, 0.45)")};
  border-radius: 999px;
  backdrop-filter: blur(8px);
  border: ${({ $critical }) => ($critical ? "1px solid rgba(248, 113, 113, 0.65)" : "1px solid transparent")};
  animation: ${({ $critical }) => ($critical ? `${criticalPulse} 1.6s ease-in-out infinite` : "none")};

  svg {
    width: 14px;
    height: 14px;
    color: ${({ $critical, $color }) => ($critical ? "#f87171" : $color || "#94a3b8")};
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
  color: ${({ $active }) => ($active ? "#a78bfa" : "rgba(255,255,255,0.7)")};
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

  @media (max-width: 768px) {
    position: relative;
    bottom: auto;
    left: auto;
    right: auto;
    padding: 0.75rem 1rem 1rem;
    margin-top: 0.25rem;
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

  @media (max-width: 640px) {
    flex-wrap: wrap;
    align-items: flex-start;
  }
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

  span {
    display: block;
    width: 100%;
    height: 100%;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const AvatarPlaceholder = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
    &:last-child {
      margin-bottom: 0;
    }
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

const MutedChevron = styled(ChevronRight)`
  color: #64748b;
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

const FullScreenBox = styled.div<{ $embedded?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${({ $embedded }) => ($embedded ? "100%" : "100vh")};
  min-height: ${({ $embedded }) => ($embedded ? "100%" : "100dvh")};
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
  max-width: 520px;
  line-height: 1.6;
`

const FinalStats = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
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

const LoadingScreen = styled.div<{ $embedded?: boolean }>`
  min-height: ${({ $embedded }) => ($embedded ? "100%" : "100vh")};
  min-height: ${({ $embedded }) => ($embedded ? "100%" : "100dvh")};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0f1a;
  color: #94a3b8;
  padding: 2rem;
  text-align: center;
  gap: 1.5rem;
`

const ErrorScreen = styled.div<{ $embedded?: boolean }>`
  min-height: ${({ $embedded }) => ($embedded ? "100%" : "100vh")};
  min-height: ${({ $embedded }) => ($embedded ? "100%" : "100dvh")};
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

const isValidMediaUrl = (url: string | undefined): boolean => {
  if (!url) return false
  return (
    url.startsWith("/scenes/") ||
    url.startsWith("/audio/") ||
    url.includes("cloudinary.com") ||
    url.includes("res.cloudinary.com")
  )
}

const withCloudinaryTransform = (url: string, transform: string): string => {
  if (!url.includes("cloudinary.com")) return url
  try {
    const parsed = new URL(url)
    const uploadIndex = parsed.pathname.indexOf("/upload/")
    if (uploadIndex === -1) return url
    const afterUpload = parsed.pathname.slice(uploadIndex + "/upload/".length)
    if (!afterUpload.startsWith("v")) return url
    if (parsed.pathname.includes(`/upload/${transform}/`)) return url
    parsed.pathname = parsed.pathname.replace("/upload/", `/upload/${transform}/`)
    return parsed.toString()
  } catch {
    return url
  }
}

const normalizeText = (text?: string[] | string) => {
  if (!text) return []
  if (Array.isArray(text)) return text
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean)
}

const buildEffectTooltip = (type: "money" | "health" | "time" | "support", value: number, label?: string) => {
  const lowerLabel = label?.toLowerCase() ?? ""
  const isPositive = value > 0
  const baseByType = {
    money: isPositive ? "Income or savings gained." : "Spending cash on essentials.",
    health: isPositive ? "Recovery, rest, or relief." : "Stress, exhaustion, or health strain.",
    time: isPositive ? "Time saved for later tasks." : "Hours consumed by obligations.",
    support: isPositive ? "Support network strengthened." : "Support network strained.",
  }

  if (type === "money") {
    if (lowerLabel.includes("grocery") || lowerLabel.includes("food") || lowerLabel.includes("meal")) {
      return "Groceries for a few days (rice, eggs, produce)."
    }
    if (lowerLabel.includes("lawyer") || lowerLabel.includes("legal")) {
      return "Immigration legal support fees."
    }
    if (lowerLabel.includes("rent") || lowerLabel.includes("housing") || lowerLabel.includes("utility")) {
      return "Housing or utility costs."
    }
    if (lowerLabel.includes("work") && isPositive) {
      return "Shift income or overtime."
    }
  }

  if (type === "time") {
    if (lowerLabel.includes("school") || lowerLabel.includes("study")) {
      return "Hours pulled away from schoolwork."
    }
    if (lowerLabel.includes("work")) {
      return "Work hours plus commute."
    }
    if (lowerLabel.includes("meeting") || lowerLabel.includes("appointment")) {
      return "Appointment time and waiting."
    }
  }

  if (type === "health") {
    if (lowerLabel.includes("sleep") || lowerLabel.includes("rest")) {
      return "Sleep and recovery time."
    }
    if (lowerLabel.includes("stress") || lowerLabel.includes("panic")) {
      return "Stress response and emotional load."
    }
  }

  if (type === "support") {
    if (lowerLabel.includes("tell") || lowerLabel.includes("share")) {
      return "Reaching out for support."
    }
    if (lowerLabel.includes("community") || lowerLabel.includes("friends")) {
      return "Community connection and trust."
    }
  }

  return baseByType[type]
}

const renderEffectTag = (type: "money" | "health" | "time" | "support", value: number, label?: string) => {
  if (value === 0) return null

  const isPositive = value > 0
  const prefix = isPositive ? "+" : ""
  const tooltip = buildEffectTooltip(type, value, label)

  switch (type) {
    case "money":
      return (
        <EffectTag key="money" $positive={isPositive} title={tooltip}>
          <DollarSign />
          {prefix}
          {value}
        </EffectTag>
      )
    case "health":
      return (
        <EffectTag key="health" $positive={isPositive} title={tooltip}>
          <Heart />
          {prefix}
          {value}
        </EffectTag>
      )
    case "time":
      return (
        <EffectTag key="time" $positive={isPositive} title={tooltip}>
          <Clock />
          {prefix}
          {value}
        </EffectTag>
      )
    case "support":
      return (
        <EffectTag key="support" $positive={isPositive} title={tooltip}>
          <Users />
          {prefix}
          {value}
        </EffectTag>
      )
    default:
      return null
  }
}

export function StoryPreviewLoading({ embedded = false }: { embedded?: boolean }) {
  return (
    <LoadingScreen $embedded={embedded}>
      <p>Loading preview...</p>
    </LoadingScreen>
  )
}

export function StoryPreviewError({ message, onExit, exitLabel, embedded = false }: StoryPreviewErrorProps) {
  return (
    <ErrorScreen $embedded={embedded}>
      <p>{message}</p>
      {onExit && (
        <RestartButton onClick={onExit}>
          <ArrowLeft size={18} />
          {exitLabel ?? "Back to Creator"}
        </RestartButton>
      )}
    </ErrorScreen>
  )
}

export function StoryPreviewPlayer({
  graph,
  onExit,
  exitLabel,
  badgeLabel,
  embedded = false,
}: StoryPreviewPlayerProps) {
  const storageKey = useMemo(() => buildStoryStorageKey(graph.story), [graph.story])
  const nodeKeySet = useMemo(() => new Set(graph.nodes.map((node) => node.key)), [graph.nodes])
  const resourceSignature = useMemo(() => buildInitialResourceSignature(graph), [graph])
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentAudioSrc = useRef<string | null>(null)
  const preloadedImages = useRef<Set<string>>(new Set())
  const [currentKey, setCurrentKey] = useState<string | null>(null)
  const [choicesReady, setChoicesReady] = useState(false)
  const [showChoices, setShowChoices] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [avatarImageError, setAvatarImageError] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [historyStack, setHistoryStack] = useState<string[]>([])
  const [runId, setRunId] = useState<string>(() => createRunId())
  const [backgroundReady, setBackgroundReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(storageKey)
    const start = graph.nodes.find((n) => n.key === "start") ?? graph.nodes[0]

    if (!raw) {
      setRunId(createRunId())
      setCurrentKey(start?.key ?? null)
      setAvatarImageError(false)
      setHistoryStack([])
      currentAudioSrc.current = null

      setStats(buildInitialStats(graph))
      return
    }

    try {
      const parsed = JSON.parse(raw) as PersistedRun
      if (
        parsed.storyKey !== storageKey ||
        parsed.nodeCount !== graph.nodes.length ||
        parsed.initialResourceSignature !== resourceSignature
      ) {
        window.localStorage.removeItem(storageKey)
        setRunId(createRunId())
        setCurrentKey(start?.key ?? null)
        return
      }
      setRunId(parsed.runId || createRunId())
      setCurrentKey(parsed.currentKey && nodeKeySet.has(parsed.currentKey) ? parsed.currentKey : start?.key ?? null)
      setStats(parsed.stats || buildInitialStats(graph))
      setHistoryStack(
        Array.isArray(parsed.historyStack)
          ? parsed.historyStack.filter((key) => nodeKeySet.has(key))
          : [],
      )
      setAvatarImageError(false)
      currentAudioSrc.current = null
    } catch {
      window.localStorage.removeItem(storageKey)
      setRunId(createRunId())
      setCurrentKey(start?.key ?? null)
    }
  }, [graph, nodeKeySet, storageKey, resourceSignature])

  useEffect(() => {
    if (typeof window === "undefined") return
    const payload: PersistedRun = {
      storyKey: storageKey,
      runId,
      nodeCount: graph.nodes.length,
      currentKey,
      stats,
      historyStack,
      initialResourceSignature: resourceSignature,
      updatedAt: Date.now(),
    }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [
    currentKey,
    graph.nodes.length,
    historyStack,
    runId,
    stats,
    storageKey,
    resourceSignature,
  ])

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
    for (const n of graph.nodes) m.set(n.key, n)
    return m
  }, [graph.nodes])

  const currentNode = currentKey ? byNodeKey.get(currentKey) : undefined
  const choices = currentNode?.content?.choices ?? []
  const hasChoices = choices.length > 0
  const hasNext = Boolean(currentNode?.content?.next)
  const isComplete = Boolean(currentNode && !hasChoices && !hasNext)
  const textContent = normalizeText(currentNode?.content?.text)
  const passageImage = currentNode?.media?.image || currentNode?.media?.visual
  const passageAudio = currentNode?.media?.audio
  const hasValidImage = isValidMediaUrl(passageImage)
  const hasValidAudio = isValidMediaUrl(passageAudio)
  const optimizedPassageImage =
    hasValidImage && passageImage ? withCloudinaryTransform(passageImage, "f_auto,q_auto,w_1600") : passageImage
  const isCloudinaryImage = Boolean(passageImage && passageImage.includes("cloudinary.com"))
  const blurredPassageImage =
    hasValidImage && isCloudinaryImage && passageImage
      ? withCloudinaryTransform(passageImage, "f_auto,q_auto:low,w_60,e_blur:1000")
      : null

  useEffect(() => {
    if (!optimizedPassageImage) {
      setBackgroundReady(false)
      return
    }
    let cancelled = false
    setBackgroundReady(false)
    const img = new Image()
    img.src = optimizedPassageImage
    const handleLoad = () => {
      if (!cancelled) setBackgroundReady(true)
    }
    img.addEventListener("load", handleLoad)
    img.addEventListener("error", handleLoad)
    return () => {
      cancelled = true
      img.removeEventListener("load", handleLoad)
      img.removeEventListener("error", handleLoad)
    }
  }, [optimizedPassageImage])

  useEffect(() => {
    if (!currentNode) return
    const nextKeys = new Set<string>()
    if (currentNode.content?.next) {
      nextKeys.add(currentNode.content.next)
    }
    for (const choice of currentNode.content?.choices ?? []) {
      if (choice.leads_to) nextKeys.add(choice.leads_to)
    }
    nextKeys.forEach((key) => {
      const targetNode = byNodeKey.get(key)
      const imageUrl = targetNode?.media?.image || targetNode?.media?.visual
      if (!isValidMediaUrl(imageUrl)) return
      const preloadUrl = imageUrl ? withCloudinaryTransform(imageUrl, "f_auto,q_auto,w_1600") : null
      if (!preloadUrl) return
      if (preloadedImages.current.has(preloadUrl)) return
      preloadedImages.current.add(preloadUrl)
      const img = new Image()
      img.src = preloadUrl
    })
  }, [byNodeKey, currentNode])

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
          playPromise.catch(() => undefined)
        }
      }
    } else if (currentAudioSrc.current) {
      audio.pause()
      audio.currentTime = 0
      currentAudioSrc.current = null
    }
  }, [currentKey, audioEnabled, hasValidAudio, passageAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!audioEnabled && currentAudioSrc.current) {
      audio.pause()
    } else if (audioEnabled && currentAudioSrc.current && passageAudio === currentAudioSrc.current) {
      audio.play().catch(() => undefined)
    }
  }, [audioEnabled, passageAudio])

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      if (audio) {
        audio.pause()
        currentAudioSrc.current = null
      }
    }
  }, [])

  const getAvatarImage = (): string | null => {
    const imagePath = graph.avatar?.appearance?.image
    if (!isValidMediaUrl(imagePath)) return null
    return withCloudinaryTransform(imagePath!, "f_auto,q_auto,w_400")
  }

  const handleChoice = (choice: StoryChoice) => {
    if (choice.effects) {
      setStats((prev) => ({
        money: Math.max(0, prev.money + (choice.effects?.money ?? 0)),
        health: Math.max(0, Math.min(100, prev.health + (choice.effects?.health ?? 0))),
        time: Math.max(0, prev.time + (choice.effects?.time ?? 0)),
        support: Math.max(0, prev.support + (choice.effects?.support ?? 0)),
      }))
    }

    if (currentKey) {
      setHistoryStack((prev) => [...prev, currentKey])
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
        setHistoryStack((prev) => [...prev, currentKey])
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
      setHistoryStack((prev) => prev.slice(0, -1))
      setCurrentKey(previous)
    }
  }

  const handleRestart = () => {
    const start = graph.nodes.find((n) => n.key === "start") ?? graph.nodes[0]
    setCurrentKey(start?.key ?? null)
    setAvatarImageError(false)
    setHistoryStack([])
    currentAudioSrc.current = null
    setRunId(createRunId())
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey)
    }

    setStats(buildInitialStats(graph))
  }

  const canStepBack = historyStack.length > 0
  const avatarImage = getAvatarImage()
  const showAvatarImage = avatarImage && !avatarImageError
  const avatarName = graph.avatar?.name || graph.story.title || "Character"
  const resourceTooltips = {
    money: "Cash remaining this week",
    time: "Hours available before assessment",
    health: "Wellbeing (stress, sleep, nutrition)",
    support: "Community support available",
  }
  const critical = {
    money: stats.money <= 20,
    time: stats.time <= 20,
    health: stats.health <= 35,
    support: stats.support > 0 && stats.support <= 10,
  }

  if (isComplete) {
    return (
      <Container $embedded={embedded}>
        <FullScreenBox $embedded={embedded}>
          <EndTitle>Story Complete</EndTitle>
          <EndSubtitle>You reached the end of this branch.</EndSubtitle>
          <FinalStats>
            <StatPill $color="#60a5fa" $critical={critical.time} title={resourceTooltips.time}>
              <Clock size={14} />
              {stats.time}h
            </StatPill>
            <StatPill $color="#4ade80" $critical={critical.money} title={resourceTooltips.money}>
              <DollarSign size={14} />${stats.money}
            </StatPill>
            <StatPill $color="#f87171" $critical={critical.health} title={resourceTooltips.health}>
              <Heart size={14} />
              {stats.health}%
            </StatPill>
            {stats.support > 0 && (
              <StatPill $color="#c084fc" $critical={critical.support} title={resourceTooltips.support}>
                <Users size={14} />
                {stats.support} support
              </StatPill>
            )}
          </FinalStats>
          <ButtonGroup>
            <RestartButton onClick={handleRestart}>
              <RotateCcw size={18} />
              Restart
            </RestartButton>
            {onExit && (
              <ContinueButton onClick={onExit}>
                {exitLabel ?? "Back to Creator"}
                <ChevronRight size={18} />
              </ContinueButton>
            )}
          </ButtonGroup>
        </FullScreenBox>
        <PreviewBadge>{badgeLabel ?? "Creator Preview Mode"}</PreviewBadge>
      </Container>
    )
  }

  if (!currentNode) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      currentAudioSrc.current = null
    }
    return (
      <Container $embedded={embedded}>
        <FullScreenBox $embedded={embedded}>
          <EndTitle>Preview Complete</EndTitle>
          <EndSubtitle>You have reached the end of this story branch.</EndSubtitle>

          <FinalStats>
            <StatPill $color="#60a5fa" $critical={critical.time} title={resourceTooltips.time}>
              <Clock size={14} />
              {stats.time}h
            </StatPill>
            <StatPill $color="#4ade80" $critical={critical.money} title={resourceTooltips.money}>
              <DollarSign size={14} />${stats.money}
            </StatPill>
            <StatPill $color="#f87171" $critical={critical.health} title={resourceTooltips.health}>
              <Heart size={14} />
              {stats.health}%
            </StatPill>
            {stats.support > 0 && (
              <StatPill $color="#c084fc" $critical={critical.support} title={resourceTooltips.support}>
                <Users size={14} />
                {stats.support} support
              </StatPill>
            )}
          </FinalStats>

          <ButtonGroup>
            <RestartButton onClick={handleRestart}>
              <RotateCcw size={18} />
              Restart Preview
            </RestartButton>
            {onExit && (
              <ContinueButton onClick={onExit}>
                {exitLabel ?? "Back to Creator"}
                <ChevronRight size={18} />
              </ContinueButton>
            )}
          </ButtonGroup>
        </FullScreenBox>
        <PreviewBadge>{badgeLabel ?? "Creator Preview Mode"}</PreviewBadge>
      </Container>
    )
  }

  return (
    <Container $embedded={embedded}>
      <HiddenAudio ref={audioRef} preload="auto" />

      <BackgroundLayer>
        {blurredPassageImage && (
          <BackgroundImage $url={blurredPassageImage} $hasImage={true} $blurred />
        )}
        <BackgroundImage
          $url={optimizedPassageImage || ""}
          $hasImage={hasValidImage}
          $loaded={hasValidImage ? backgroundReady : undefined}
        />
        <GradientOverlay />
      </BackgroundLayer>

      <TopBar>
        <BackButton onClick={onExit}>
          <ArrowLeft size={16} />
          {exitLabel ?? "Back to Creator"}
        </BackButton>
        <TopBarCenter>
          <span>{graph.story.title}</span>
          <PreviewTag>Preview</PreviewTag>
        </TopBarCenter>
        <TopBarRight>
          <StatsBar>
            <StatPill $color="#60a5fa" $critical={critical.time} title={resourceTooltips.time}>
              <Clock />
              {stats.time}h
            </StatPill>
            <StatPill $color="#4ade80" $critical={critical.money} title={resourceTooltips.money}>
              <DollarSign />${stats.money}
            </StatPill>
            <StatPill $color="#f87171" $critical={critical.health} title={resourceTooltips.health}>
              <Heart />
              {stats.health}%
            </StatPill>
            {stats.support > 0 && (
              <StatPill $color="#c084fc" $critical={critical.support} title={resourceTooltips.support}>
                <Users />
                {stats.support}
              </StatPill>
            )}
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
                <OptimizedStoryImage
                  src={avatarImage}
                  alt={avatarName}
                  width={44}
                  height={44}
                  sizes="44px"
                  fallback={
                    <AvatarPlaceholder>
                      <User size={20} />
                    </AvatarPlaceholder>
                  }
                />
              ) : (
                <AvatarPlaceholder>
                  <User size={20} />
                </AvatarPlaceholder>
              )}
            </CharacterAvatar>
            <CharacterInfo>
              <CharacterName>{avatarName}</CharacterName>
              {currentNode.title && <PassageTitle>{currentNode.title}</PassageTitle>}
            </CharacterInfo>
            {canStepBack && (
              <StepBackButton onClick={handleStepBack}>
                <ArrowLeft size={14} />
                Back
              </StepBackButton>
            )}
          </TextBoxHeader>
          <NarrativeText>
            {textContent.map((text, i) => (
              <p key={`${currentNode.key}-text-${i}`}>{text}</p>
            ))}
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
                    {choice.effects?.money !== undefined &&
                      renderEffectTag("money", choice.effects.money, choice.text)}
                    {choice.effects?.health !== undefined &&
                      renderEffectTag("health", choice.effects.health, choice.text)}
                    {choice.effects?.time !== undefined && renderEffectTag("time", choice.effects.time, choice.text)}
                    {choice.effects?.support !== undefined &&
                      renderEffectTag("support", choice.effects.support, choice.text)}
                    {(!choice.effects ||
                      (!choice.effects.money &&
                        !choice.effects.health &&
                        !choice.effects.time &&
                        !choice.effects.support)) && <MutedChevron size={16} />}
                  </ChoiceEffects>
                </ChoiceButton>
              ))}
            </ChoicesGrid>
          </ChoicesContainer>
        )}

        {hasNext && !hasChoices && (
          <ContinueButton onClick={handleContinue}>
            Continue
            <ChevronRight size={18} />
          </ContinueButton>
        )}
      </ContentArea>

      <PreviewBadge>{badgeLabel ?? "Creator Preview Mode"}</PreviewBadge>
    </Container>
  )
}
