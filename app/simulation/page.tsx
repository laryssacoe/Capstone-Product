"use client"

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styled, { css, keyframes } from "styled-components"
import {
  Heart,
  Clock,
  DollarSign,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Users,
  BarChart3,
  BookOpen,
  Scale,
  Home,
  GraduationCap,
  Briefcase,
  Shield,
  Volume2,
  VolumeX,
} from "lucide-react"
import type { Avatar, AvatarAppearance, Resources, SocialContext } from "@/types/simulation"
import OptimizedStoryImage from "@/components/optimized-story-image"
import { resolveStoryRuntimeConfig, type PostReflectionStatIconKey, type StoryRuntimeConfig } from "@/lib/story-runtime-config"
import { simulationAnalyticsDefaults, type SimulationAnalyticsActionIcon } from "@/lib/simulation-analytics-defaults"
import { normalizeImagePath } from "@/lib/story-media-path"

interface StoryChoice {
  id: string
  text: string
  leads_to: string
  effects?: { money?: number; health?: number; time?: number }
}

interface StoryPassage {
  id: string
  title?: string
  text: string | string[]
  emotion?: string
  intensity?: number
  image?: string
  audio?: string
  choices?: StoryChoice[]
  next?: string
  nextChoiceId?: string
  nextEffects?: StoryChoice["effects"]
}

type StoryNodeContentPayload = {
  title?: string | null
  duration?: string | null
  text?: unknown
  choices?: { id: string; text?: string; leads_to?: string; effects?: Record<string, number> }[] | null
  next?: string | null
  emotion?: string | null
  intensity?: number | null
}

type StoryNodePayload = {
  id: string
  key: string
  content?: StoryNodeContentPayload | null
  media?: { visual?: string | null; image?: string | null; audio?: string | null } | null
}

type StoryTransitionPayload = {
  fromNodeId: string
  toNodeId?: string | null
  pathId: string
  ordering?: number | null
}

type HistoryEntry = {
  passageId: string
  stats: { money: number; health: number; time: number }
  hiddenState: {
    schoolRisk: number
    workRisk: number
    systemRisk: number
    supportScore: number
    honestyScore: number
  }
  visitedPassages: string[]
  choicesMade: string[]
  choiceHistory: ChoiceRecord[]
  hasReportedCompletion: boolean
}

type ChoiceRecord = {
  from: string
  to?: string
  label: string
  effects?: StoryChoice["effects"]
  kind: "choice" | "continue"
}

const postReflectionIconMap: Record<PostReflectionStatIconKey, typeof Users> = {
  users: Users,
  graduationCap: GraduationCap,
  dollarSign: DollarSign,
  home: Home,
  heart: Heart,
  briefcase: Briefcase,
}

const analyticsActionIconMap: Record<SimulationAnalyticsActionIcon, typeof BookOpen> = {
  bookOpen: BookOpen,
  users: Users,
  scale: Scale,
}

function getAudioConfig(
  runtimeConfig: Pick<StoryRuntimeConfig, "backgroundAudio"> | null | undefined,
): { path: string; volume: number } | null {
  if (!runtimeConfig?.backgroundAudio?.path) return null
  const normalizedPath = normalizeStoryMediaPath(runtimeConfig.backgroundAudio.path, "audio")
  if (!normalizedPath) return null
  const localAudioPath = getLocalAudioPath(normalizedPath)
  if (localAudioPath && !localAudioAllow.has(localAudioPath.toLowerCase())) return null
  return {
    ...runtimeConfig.backgroundAudio,
    path: normalizedPath,
  }
}

function formatHoursAndMinutesFromHours(hours: number): string {
  const safeHours = Math.max(0, hours)
  const totalMinutes = Math.round(safeHours * 60)
  const wholeHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  if (wholeHours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${wholeHours}h`
  return `${wholeHours}h ${remainingMinutes}m`
}

const neutralSceneImage = "/scenes/neutral-image.png"
const localAudioAllow = new Set(["/audios/katrina.mp3"])

function getLocalAudioPath(value: string): string | null {
  if (!value) return null
  if (value.startsWith("/audios/")) {
    return value.split("?")[0]
  }
  if (!/^https?:\/\//i.test(value)) return null
  try {
    const parsed = new URL(value)
    if (parsed.pathname.startsWith("/audios/")) {
      return parsed.pathname
    }
  } catch {
    return null
  }
  return null
}

function collapseAdjacentPathSegments(segments: string[]): string[] {
  const normalized: string[] = []
  let previousKey = ""

  segments.forEach((segment) => {
    const trimmed = segment.trim()
    if (!trimmed) return

    const currentKey = decodeURIComponent(trimmed).toLowerCase()
    if (currentKey === previousKey) return

    normalized.push(trimmed)
    previousKey = currentKey
  })

  return normalized
}

function dedupeCloudinaryPathSegments(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("cloudinary.com")) return url

    const segments = parsed.pathname.split("/")
    const uploadIndex = segments.findIndex((segment) => segment === "upload")
    if (uploadIndex === -1) return url

    const prefix = segments.slice(0, uploadIndex + 1)
    const suffix = segments.slice(uploadIndex + 1)
    const normalizedSuffix = collapseAdjacentPathSegments(suffix)

    parsed.pathname = [...prefix, ...normalizedSuffix].join("/")
    return parsed.toString()
  } catch {
    return url
  }
}

function normalizeStoryMediaPath(
  value: string | null | undefined,
  kind: "image" | "audio",
): string {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return ""

  if (/^https?:\/\//i.test(raw)) {
    return kind === "image" ? normalizeImagePath(raw) : dedupeCloudinaryPathSegments(raw)
  }

  const hasImageExt = /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(raw)
  const hasAudioExt = /\.(mp3|wav|ogg|m4a)$/i.test(raw)
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`
  const pathSegments = withLeadingSlash.split("/").filter(Boolean)
  const firstSegment = pathSegments[0] ?? ""

  if (kind === "image" && hasImageExt) {
    const isSingleFile = pathSegments.length === 1
    if (isSingleFile || firstSegment === "uploads") {
      return `/scenes/${pathSegments[pathSegments.length - 1]}`
    }
  }

  if (kind === "audio" && hasAudioExt) {
    const isSingleFile = pathSegments.length === 1
    if (isSingleFile) {
      return `/audios/${pathSegments[pathSegments.length - 1]}`
    }
  }

  const normalizedSegments = collapseAdjacentPathSegments(pathSegments)
  return `/${normalizedSegments.join("/")}`
}

function isStoryVisualPath(image: string | null | undefined): image is string {
  return Boolean(
    image &&
      (image.startsWith("/scenes/") ||
        image.includes("cloudinary.com") ||
        image.includes("res.cloudinary.com")),
  )
}

function resolveBackdropImage(primary: string | null | undefined): string {
  const normalized = normalizeStoryMediaPath(primary, "image")
  if (isStoryVisualPath(normalized)) return normalized
  return neutralSceneImage
}

function resolveInitialHealth(resources: Record<string, unknown>): number {
  const candidates = [resources.health, resources.physicalHealth, resources.mentalHealth]
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.max(0, Math.min(100, value))
    }
  }
  return 100
}

const fadeIn = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`

const fadeInOnly = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`

const cinematicIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.8);
    filter: blur(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
`

const cinematicOut = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: scale(1.12);
    filter: blur(8px);
  }
`

const slowZoomDrift = keyframes`
  0% { transform: scale(1); }
  100% { transform: scale(1.12); }
`

const countUp = keyframes`
  0% { opacity: 0; transform: translateY(20px) scale(0.8); }
  60% { opacity: 1; transform: translateY(-3px) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.1); }
  50% { box-shadow: 0 0 60px rgba(139, 92, 246, 0.25); }
`

const particleDrift = keyframes`
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  20% {
    opacity: 0.6;
  }
  80% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-120px) translateX(30px);
    opacity: 0;
  }
`

const timerFill = keyframes`
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
`

const textReveal = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const cinematicHold = 4500
const cinematicExitDuration = 500


const Container = styled.div<{ $autoHeight?: boolean }>`
  position: relative;
  width: 100%;
  height: ${({ $autoHeight }) => ($autoHeight ? "auto" : "100vh")};
  height: ${({ $autoHeight }) => ($autoHeight ? "auto" : "100dvh")};
  min-height: ${({ $autoHeight }) => ($autoHeight ? "100vh" : "auto")};
  min-height: ${({ $autoHeight }) => ($autoHeight ? "100dvh" : "auto")};
  overflow: ${({ $autoHeight }) => ($autoHeight ? "auto" : "hidden")};
  background: #0f172a;

  @media (max-width: 768px) {
    height: auto;
    min-height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
  }
`

const BackgroundLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
`

const BackgroundFallback = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #1e1b4b 50%, #0f172a 75%, #1e1b4b 100%);
`

const BackgroundImageLayer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
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
  &:hover { color: #ffffff; }
`

const TopBarCenter = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 500;
  
  @media (max-width: 768px) {
    display: none;
  }
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
    row-gap: 0.35rem;
  }
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
  
  @media (max-width: 640px) {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    svg { width: 12px; height: 12px; }
  }
`

const AudioButton = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: rgba(0, 0, 0, 0.45);
  border: none;
  border-radius: 50%;
  color: ${({ $active, $disabled }) =>
    $disabled ? "rgba(148, 163, 184, 0.55)" : $active ? "#a78bfa" : "rgba(255,255,255,0.7)"};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.75 : 1)};
  backdrop-filter: blur(8px);
  transition: all 0.2s;
  
  &:hover {
    background: ${({ $disabled }) => ($disabled ? "rgba(0, 0, 0, 0.45)" : "rgba(139, 92, 246, 0.3)")};
    color: ${({ $disabled }) => ($disabled ? "rgba(148, 163, 184, 0.55)" : "#a78bfa")};
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  flex-shrink: 0;
  
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
  transform: ${({ $visible }) => ($visible ? "translateY(0)" : "translateY(10px)")};
  transition: opacity 0.4s ease, transform 0.4s ease;
`

const ChoicesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`

const ChoiceButton = styled.button<{ $index: number; $visible: boolean }>`
  width: 100%;
  padding: 0.875rem 1.125rem;
  background: rgba(51, 65, 85, 0.65);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 0.75rem;
  color: #e2e8f0;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.875rem;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: ${({ $visible }) => ($visible ? "translateX(0)" : "translateX(-10px)")};
  transition-delay: ${({ $index }) => $index * 0.08}s;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: rgba(139, 92, 246, 0.28);
    border-color: rgba(139, 92, 246, 0.65);
    transform: translateX(4px);
    box-shadow: 0 6px 20px -4px rgba(139, 92, 246, 0.35);
  }
  
  &:active {
    transform: translateX(2px);
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

const ContinueButton = styled.button<{ $disabled?: boolean; $inline?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${({ $disabled }) => ($disabled ? "#475569" : "linear-gradient(135deg, #8b5cf6, #6366f1)")};
  border: none;
  border-radius: 0.625rem;
  color: white;
  font-size: 0.925rem;
  font-weight: 500;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s;
  margin: ${({ $inline }) => ($inline ? "0" : "0 auto")};
  box-shadow: ${({ $disabled }) => ($disabled ? "none" : "0 4px 16px -4px rgba(139, 92, 246, 0.4)")};
  
  &:hover { 
    transform: ${({ $disabled }) => ($disabled ? "none" : "scale(1.02)")};
    box-shadow: ${({ $disabled }) => ($disabled ? "none" : "0 8px 24px -8px rgba(139, 92, 246, 0.5)")};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    background: #475569;
  }
`

const ReplayButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 0.625rem;
  color: #c4b5fd;
  font-size: 0.925rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.25);
  }
`

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
`

const CinematicScreen = styled.div`
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 2rem;

  @media (max-width: 768px) {
    align-items: flex-start;
    padding: 1rem;
    padding-top: 4rem;
    padding-bottom: 2rem;
  }
`

const CinematicBg = styled.div<{ $url?: string }>`
  position: fixed;
  inset: -24px;
  background: ${({ $url }) =>
    $url
      ? `linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%), url(${$url}) center/cover no-repeat`
      : "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)"};
  background-blend-mode: overlay;
  filter: blur(20px) brightness(0.3);
  transform: scale(1.1);
  pointer-events: none;

  @media (max-width: 768px) {
    position: absolute;
    inset: 0;
  }
`

const CinematicOverlay = styled.div<{ $tint?: string }>`
  position: absolute;
  inset: 0;
  background: ${({ $tint }) => $tint || "linear-gradient(to bottom, rgba(15,23,42,0.7), rgba(15,23,42,0.92))"};
`

const CinematicContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 640px;
  width: 100%;
  animation: ${fadeIn} 0.6s ease;
`

const CinematicCard = styled.div`
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 1.25rem;
  backdrop-filter: blur(24px);
  padding: 2.5rem 2rem;
  width: 100%;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.5);
`

const CinematicAvatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(139, 92, 246, 0.5);
  margin: 0 auto 1.25rem auto;
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.2);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const GameOverIcon = styled.div<{ $color: string }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}15`};
  border: 2px solid ${({ $color }) => `${$color}40`};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem auto;
  color: ${({ $color }) => $color};
`

const GameOverTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #f87171;
`

const GameOverText = styled.p`
  font-size: 1rem;
  color: #94a3b8;
  margin-bottom: 2rem;
  line-height: 1.7;
`

const CompletionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #c4b5fd;
`

const CompletionText = styled.p`
  font-size: 1rem;
  color: #94a3b8;
  margin-bottom: 1.5rem;
  max-width: 600px;
  line-height: 1.7;
`

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.75rem;
  width: 100%;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const StatTile = styled.div<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid ${({ $accent }) => `${$accent}30`};
  border-radius: 0.75rem;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 500;

  svg {
    color: ${({ $accent }) => $accent};
    flex-shrink: 0;
  }
`

const StatTileLabel = styled.span`
  color: #64748b;
  font-weight: 400;
  font-size: 0.8rem;
`

const ReflectionIntroText = styled(CompletionText)`
  margin-bottom: 1.25rem;
`

const ReflectionCard = styled.div`
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 1rem;
  backdrop-filter: blur(16px);
  padding: 1.75rem;
  width: 100%;
  max-width: 560px;
  margin-bottom: 1.5rem;
  text-align: left;
`

const ReflectionTitle = styled.h3`
  color: #c4b5fd;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  text-align: center;
`

const ReflectionQuestion = styled.div`
  margin-bottom: 1.25rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid rgba(71, 85, 105, 0.2);
  &:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
`

const QuestionText = styled.p`
  color: #e2e8f0;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
`

const QuestionNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;
  flex-shrink: 0;
`

const ReflectionOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-left: 1.875rem;
`

const ReflectionOption = styled.button<{ $selected: boolean }>`
  padding: 0.4rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  border: 1px solid ${({ $selected }) => ($selected ? "#8b5cf6" : "rgba(71, 85, 105, 0.4)")};
  background: ${({ $selected }) => ($selected ? "rgba(139, 92, 246, 0.2)" : "rgba(51, 65, 85, 0.25)")};
  color: ${({ $selected }) => ($selected ? "#c4b5fd" : "#94a3b8")};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #8b5cf6;
    color: #c4b5fd;
  }
`

const OpenEndedInput = styled.textarea`
  width: calc(100% - 1.875rem);
  margin-left: 1.875rem;
  min-height: 110px;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 0.5rem;
  color: #e2e8f0;
  font-size: 0.9rem;
  resize: vertical;
  margin-top: 0.5rem;
  font-family: inherit;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
  }

  &::placeholder {
    color: #64748b;
  }
`

const ReflectionHint = styled.p`
  color: #64748b;
  font-size: 0.8rem;
  margin-top: 0.75rem;
  text-align: center;
`

const AnalyticsScreen = styled.div<{ $centered?: boolean }>`
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: ${({ $centered }) => ($centered ? "flex" : "block")};
  flex-direction: column;
  align-items: ${({ $centered }) => ($centered ? "center" : "initial")};
  justify-content: ${({ $centered }) => ($centered ? "center" : "initial")};
  overflow-x: hidden;
  overflow-y: auto;
  padding: 2rem;
  background: #0f172a;
  color: #e2e8f0;

  @media (max-width: 768px) {
    padding: 1rem;
    padding-top: 3.5rem;
    padding-bottom: 2rem;
    justify-content: flex-start;
  }
`

const AnalyticsBg = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12), transparent 70%),
              linear-gradient(to bottom, #0f172a, #1e1b4b);
`

const AnalyticsBody = styled.div`
  position: relative;
  z-index: 2;
  animation: ${fadeIn} 0.6s ease;
  text-align: center;
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const SectionTitle = styled.h2<{ $marginBottom?: string }>`
  font-size: 1.5rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: ${({ $marginBottom }) => $marginBottom || "1.5rem"};
  text-align: center;
`

const ActionSubtitle = styled.p`
  color: #94a3b8;
  margin-bottom: 2rem;
  font-size: 0.95rem;
`

/* ── Cinematic Stat Carousel ── */

const CinematicStage = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`

const Particle = styled.div<{ $x: number; $delay: number; $color: string }>`
  position: absolute;
  z-index: 1;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  left: ${({ $x }) => $x}%;
  bottom: 30%;
  animation: ${particleDrift} 3s ease ${({ $delay }) => $delay}s infinite;
  opacity: 0;
`

const CinematicStatEntering = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 480px;
  animation: ${cinematicIn} 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards,
             ${slowZoomDrift} 5s ease-out 0.7s forwards;
`

const CinematicStatExiting = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 480px;
  animation: ${cinematicOut} 0.5s ease forwards;
`

const CinematicIconRing = styled.div<{ $color: string }>`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: radial-gradient(circle, ${({ $color }) => $color}20, transparent 70%);
  border: 2px solid ${({ $color }) => $color}35;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: ${({ $color }) => $color};
  animation: ${glowPulse} 2s ease-in-out infinite;
`

const CinematicStatValue = styled.div`
  font-size: 4.5rem;
  font-weight: 800;
  color: #f1f5f9;
  line-height: 1;
  margin-bottom: 0.5rem;
  animation: ${countUp} 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s backwards;
  text-shadow: 0 0 40px rgba(139, 92, 246, 0.3);
`

const CinematicStatLabel = styled.div`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #94a3b8;
  margin-bottom: 1rem;
`

const CinematicStatDesc = styled.p`
  color: #cbd5e1;
  font-size: 1.05rem;
  line-height: 1.7;
  max-width: 400px;
  text-wrap: balance;
  animation: ${fadeIn} 0.8s ease 0.8s backwards;
`

const CinematicStatSource = styled.p`
  color: #475569;
  font-size: 0.7rem;
  font-style: italic;
  margin-top: 0.75rem;
  animation: ${fadeIn} 0.6s ease 1.2s backwards;
`

const CinematicProgress = styled.div`
  position: absolute;
  z-index: 2;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`

const ProgressDots = styled.div`
  display: flex;
  gap: 6px;
`

const ProgressDot = styled.div<{ $state: "done" | "active" | "upcoming" }>`
  width: ${({ $state }) => ($state === "active" ? "28px" : "6px")};
  height: 6px;
  border-radius: 3px;
  background: ${({ $state }) =>
    $state === "done" ? "#8b5cf6" : $state === "active" ? "#a78bfa" : "#1e293b"};
  transition: all 0.4s ease;
`

const ProgressTimerBar = styled.div<{ $duration: number }>`
  width: 200px;
  height: 2px;
  background: rgba(51, 65, 85, 0.3);
  border-radius: 1px;
  overflow: hidden;
  
  &::after {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    animation: ${timerFill} ${({ $duration }) => $duration}ms linear forwards;
    transform-origin: left;
  }
`

const CinematicContinueWrap = styled.div`
  margin-top: 2rem;
  animation: ${fadeIn} 0.6s ease;
`

const SkipBtn = styled.button`
  background: transparent;
  border: none;
  color: #475569;
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: #94a3b8; }
`


const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.875rem;
  margin-bottom: 2rem;
  width: 100%;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`

const ActionCard = styled.div<{ $accent: string }>`
  background: ${({ $accent }) => $accent}08;
  border: 1px solid ${({ $accent }) => $accent}25;
  border-radius: 1rem;
  padding: 1.25rem;
  text-align: left;
  transition: all 0.2s;
  &:hover { border-color: ${({ $accent }) => $accent}50; transform: translateY(-2px); }
`

const ActionCardIcon = styled.div<{ $color: string }>`
  color: ${({ $color }) => $color};
  margin-bottom: 0.625rem;
`

const ActionCardTitle = styled.h3`
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.375rem;
`

const ActionCardDesc = styled.p`
  color: #94a3b8;
  font-size: 0.8rem;
  line-height: 1.5;
  text-wrap: balance;
  min-height: 3.3em;
`

const OrgLabel = styled.p`
  color: #64748b;
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
`

const OrgGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  justify-content: center;
  margin-bottom: 2rem;
`

const ResourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(51, 65, 85, 0.3);
  border: 1px solid rgba(71, 85, 105, 0.25);
  border-radius: 9999px;
  color: #94a3b8;
  font-size: 0.8rem;
  text-decoration: none;
  transition: all 0.2s;
  &:hover { background: rgba(139, 92, 246, 0.15); border-color: rgba(139, 92, 246, 0.3); color: #c4b5fd; }
`

const MethodologyBox = styled.div`
  width: 100%;
  margin: 0 auto 2.5rem auto;
  border: 1px solid rgba(71, 85, 105, 0.25);
  border-radius: 1rem;
  padding: 1.75rem 2rem;
  text-align: left;
  max-width: 620px;
  background: rgba(15, 23, 42, 0.6);
`

const MethodologyHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(71, 85, 105, 0.2);
`

const MethodologyIconWrapper = styled.div`
  color: #64748b;
`

const MethodologyTitle = styled.p`
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  margin: 0;
`

const MethodologyGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
  margin-bottom: 1.25rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const MethodologySourceItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const MethodologySourceLabel = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
`

const MethodologySourceValue = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.5;
`

const MethodologyNote = styled.p`
  font-size: 0.75rem;
  color: #475569;
  line-height: 1.6;
  padding-top: 1rem;
  border-top: 1px solid rgba(71, 85, 105, 0.15);
  margin: 0;
`

/* ── Loading ── */

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  background: #0f172a;
  color: #e2e8f0;
  padding: 1.5rem;
  text-align: center;
`

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`

const LoadingText = styled.p`
  margin-top: 1rem;
  color: #94a3b8;
`

const defaultAppearance: AvatarAppearance = {
  skinTone: "",
  hairColor: "",
  hairStyle: "",
  clothing: "",
  accessories: [],
}

const defaultResources: Resources = {
  money: 0,
  time: 0,
  energy: 0,
  socialSupport: 0,
  mentalHealth: 0,
  physicalHealth: 0,
}

const defaultSocialContext: SocialContext = {
  socioeconomicStatus: "middle",
  location: "",
  familyStructure: "",
  educationLevel: "",
  employmentStatus: "",
  healthConditions: [],
  socialIssues: [],
}

function normalizeAvatar(raw: any, storySlug: string | null): Avatar {
  const appearance: AvatarAppearance = {
    ...defaultAppearance,
    ...(raw?.appearance ?? {}),
    accessories: Array.isArray(raw?.appearance?.accessories)
      ? (raw.appearance.accessories as string[])
      : defaultAppearance.accessories,
  }

  const initialResources: Resources = { ...defaultResources }
  ;(Object.keys(defaultResources) as (keyof Resources)[]).forEach((key) => {
    const value = raw?.initialResources?.[key]
    initialResources[key] = typeof value === "number" ? value : defaultResources[key]
  })

  const rawContext = raw?.socialContext ?? {}
  const socialContext: SocialContext = {
    ...defaultSocialContext,
    ...rawContext,
    socioeconomicStatus: ["low", "middle", "high"].includes(rawContext?.socioeconomicStatus)
      ? rawContext.socioeconomicStatus
      : defaultSocialContext.socioeconomicStatus,
    healthConditions: Array.isArray(rawContext?.healthConditions) ? (rawContext.healthConditions as string[]) : [],
    socialIssues: Array.isArray(rawContext?.socialIssues)
      ? (rawContext.socialIssues as any[]).map((issue) => ({
          id: issue?.id ?? "",
          type: issue?.type ?? "racism",
          severity: issue?.severity ?? "moderate",
          description: issue?.description ?? "",
          impacts: Array.isArray(issue?.impacts) ? issue.impacts : [],
        }))
      : [],
  } as SocialContext

  return {
    id: raw?.id ?? "",
    name: raw?.name ? String(raw.name) : "",
    age: typeof raw?.age === "number" ? raw.age : 0,
    background: raw?.background ?? "",
    appearance,
    initialResources,
    socialContext,
    isPlayable: !!raw?.isPlayable,
    storySlug,
  }
}

function getAvatarProfileImage(fallback: string): string {
  return normalizeStoryMediaPath(fallback, "image")
}

function buildPersonaStory(
  avatarId: string,
  avatar: any,
  story: { title?: string | null; summary?: string | null } | null,
  nodes: StoryNodePayload[],
  transitions: StoryTransitionPayload[],
): {
  avatarId: string
  title: string
  theme: string
  avatarImage: string
  avatarName: string
  initialStats: { money: number; health: number; time: number }
  passages: Record<string, StoryPassage>
} {
  const passages: Record<string, StoryPassage> = {}
  const keyById = new Map<string, string>()

  nodes.forEach((node) => {
    keyById.set(node.id, node.key)
  })

  const transitionsByFrom = new Map<string, StoryTransitionPayload[]>()
  transitions.forEach((transition) => {
    const list = transitionsByFrom.get(transition.fromNodeId) ?? []
    list.push(transition)
    transitionsByFrom.set(transition.fromNodeId, list)
  })

  const normalizeText = (text: unknown): string[] => {
    if (Array.isArray(text)) {
      return text.map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
    }
    if (typeof text === "string") {
      const paragraphs = text
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
      return paragraphs.length ? paragraphs : [text.trim()]
    }
    return []
  }

  const normalizeEffects = (effects: any): StoryChoice["effects"] | undefined => {
    if (!effects || typeof effects !== "object") return undefined
    const normalized: StoryChoice["effects"] = {}
    
    if (typeof effects.money === "number" && Number.isFinite(effects.money)) {
      normalized.money = effects.money
    }
    if (typeof effects.health === "number" && Number.isFinite(effects.health)) {
      normalized.health = effects.health
    }
    if (typeof effects.time === "number" && Number.isFinite(effects.time)) {
      normalized.time = effects.time
    }
    
    return Object.keys(normalized).length ? normalized : undefined
  }

  nodes.forEach((node) => {
    const content = node.content ?? {}
    const media = node.media ?? {}
    const textContent = normalizeText(content.text)
    
    const visualRaw = typeof media.visual === "string" ? media.visual : (typeof media.image === "string" ? media.image : null)
    const audioRaw = typeof media.audio === "string" ? media.audio : (typeof (media as any).soundEffect === "string" ? (media as any).soundEffect : null)
    const visualValue = normalizeStoryMediaPath(visualRaw, "image")
    const audioValue = normalizeStoryMediaPath(audioRaw, "audio")
    
    const passage: StoryPassage = {
      id: node.key,
      title: typeof content.title === "string" ? content.title : undefined,
      text: textContent,
      image: visualValue || undefined,
      audio: audioValue || undefined,
      emotion: typeof content.emotion === "string" ? content.emotion : undefined,
      intensity: typeof content.intensity === "number" ? content.intensity : undefined,
    }

    const contentChoices = Array.isArray(content.choices) ? content.choices : []
    if (contentChoices.length > 1) {
      passage.choices = contentChoices.map((choice) => ({
        id: choice.id,
        text: choice.text ?? "",
        leads_to: choice.leads_to ?? "",
        effects: normalizeEffects(choice.effects),
      }))
    } else if (contentChoices.length === 1) {
      const onlyChoice = contentChoices[0]
      passage.next = onlyChoice.leads_to ?? (typeof content.next === "string" ? content.next : undefined)
      passage.nextChoiceId = onlyChoice.id
      passage.nextEffects = normalizeEffects(onlyChoice.effects)
    } else {
      const outgoing = transitionsByFrom.get(node.id) ?? []
      const first = outgoing[0]
      if (!passage.next && first?.toNodeId) {
        const key = keyById.get(first.toNodeId)
        if (key) {
          passage.next = key
          passage.nextChoiceId = passage.nextChoiceId ?? first.pathId ?? undefined
        }
      }
    }

    if (!passage.next && typeof content.next === "string") {
      passage.next = content.next
      passage.nextChoiceId = passage.nextChoiceId ?? `${node.key}-next`
    }

    passages[node.key] = passage
  })

  const initialResources = avatar?.initialResources ?? {}

  const fallbackImage = avatar?.appearance?.image ?? avatar?.image ?? "/placeholder.svg?height=120&width=120"
  const normalizedMoney =
    typeof initialResources.money === "number" && Number.isFinite(initialResources.money)
      ? Math.max(0, initialResources.money)
      : 500
  const normalizedTime =
    typeof initialResources.time === "number" && Number.isFinite(initialResources.time) && initialResources.time > 0
      ? initialResources.time
      : 100

  return {
    avatarId,
    title: story?.title ?? "",
    theme: story?.summary ?? "",
    avatarImage: getAvatarProfileImage(fallbackImage),
    avatarName: avatar?.name && String(avatar.name).trim().length > 0 ? avatar.name : story?.title ?? "Character",
    initialStats: {
      money: normalizedMoney,
      health: resolveInitialHealth(initialResources),
      time: normalizedTime,
    },
    passages,
  }
}

function SimulationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storySlug = searchParams.get("story")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [storySlugResolved, setStorySlugResolved] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [currentStory, setCurrentStory] = useState<ReturnType<typeof buildPersonaStory> | null>(null)
  const [storyRuntimeConfig, setStoryRuntimeConfig] = useState<StoryRuntimeConfig | null>(null)
  const [currentPassageId, setCurrentPassageId] = useState<string>("start")
  const [stats, setStats] = useState({ money: 500, health: 100, time: 100 })
  const [showChoices, setShowChoices] = useState(false)
  const [choicesVisible, setChoicesVisible] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsStep, setAnalyticsStep] = useState(0)
  const [statIndex, setStatIndex] = useState(0)
  const [statPhase, setStatPhase] = useState<"entering" | "visible" | "exiting">("entering")
  const [cinematicDone, setCinematicDone] = useState(false)
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({})
  const [reflectionsSubmitted, setReflectionsSubmitted] = useState(false)
  const [submittingReflections, setSubmittingReflections] = useState(false)
  const [hasReportedCompletion, setHasReportedCompletion] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [audioSourceUnavailable, setAudioSourceUnavailable] = useState(false)
  const [hiddenState, setHiddenState] = useState({
    schoolRisk: 0,
    workRisk: 0,
    systemRisk: 0,
    supportScore: 0,
    honestyScore: 0,
  })
  const [visitedPassages, setVisitedPassages] = useState<string[]>([])
  const [choicesMade, setChoicesMade] = useState<string[]>([])
  const [choiceHistory, setChoiceHistory] = useState<ChoiceRecord[]>([])
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([])
  const audioConfig = useMemo(() => getAudioConfig(storyRuntimeConfig), [storyRuntimeConfig])
  const hasStoryAudio = Boolean(audioConfig) && !audioSourceUnavailable

  useEffect(() => {
    setAudioInitialized(false)
    setAudioSourceUnavailable(false)
  }, [audioConfig?.path])

  useEffect(() => {
    if (hasStoryAudio) return
    setAudioEnabled(false)
    setAudioInitialized(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("loop_audio_muted", "true")
    }
  }, [hasStoryAudio])

  // Audio initialization
  useEffect(() => {
    if (!storySlugResolved || !currentStory || isLoading) return
    if (audioInitialized) return 
    if (!audioConfig) return

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const audio = new Audio(audioConfig.path)
    const handleAudioError = () => {
      setAudioSourceUnavailable(true)
      setAudioEnabled(false)
      setAudioInitialized(false)
      if (typeof window !== "undefined") {
        localStorage.setItem("loop_audio_muted", "true")
      }
      if (audioRef.current === audio) {
        audio.pause()
        audioRef.current = null
      }
    }

    audio.addEventListener("error", handleAudioError)
    audio.loop = true
    audio.volume = audioConfig.volume
    audioRef.current = audio

    if (audioEnabled) {
      audio.play().catch(() => {})
    }

    setAudioInitialized(true)

    return () => {
      audio.removeEventListener("error", handleAudioError)
    }
  }, [storySlugResolved, currentStory, isLoading, audioInitialized, audioEnabled, audioConfig])

  useEffect(() => {
    if (!audioRef.current) return

    if (audioEnabled) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [audioEnabled])

  useEffect(() => {
    if (!hasStoryAudio) return
    const tryPlayAudio = () => {
      if (audioRef.current && audioEnabled && audioRef.current.paused) {
        audioRef.current.play().catch(() => {})
      }
    }
    
    document.addEventListener('click', tryPlayAudio, { once: true })
    document.addEventListener('keydown', tryPlayAudio, { once: true })
    document.addEventListener('touchstart', tryPlayAudio, { once: true })
    
    return () => {
      document.removeEventListener('click', tryPlayAudio)
      document.removeEventListener('keydown', tryPlayAudio)
      document.removeEventListener('touchstart', tryPlayAudio)
    }
  }, [audioEnabled, audioInitialized, hasStoryAudio])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Session ID
  useEffect(() => {
    if (typeof window === "undefined") return
    const existing = localStorage.getItem("loop_session_id")
    if (existing) {
      setSessionId(existing)
      return
    }
    const generated = crypto.randomUUID()
    localStorage.setItem("loop_session_id", generated)
    setSessionId(generated)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const savedMute = localStorage.getItem("loop_audio_muted")
    if (savedMute === "true") {
      setAudioEnabled(false)
    }
  }, [])

  // Load story
  useEffect(() => {
    let cancelled = false

    async function loadStory() {
      setIsLoading(true)

      const slug = storySlug
      const avatarId = typeof window !== "undefined" ? localStorage.getItem("selectedAvatarId") : null

      if (!slug && !avatarId) {
        console.error("No story slug or avatar ID provided")
        router.push("/scenarios")
        return
      }

      try {
        let data = null

        if (slug) {
          try {
            const response = await fetch(`/api/stories/${slug}`, { cache: "no-store" })
            const raw = await response.text()
            data = raw ? JSON.parse(raw) : null

            if (!response.ok) {
              data = null
            }
          } catch {}
        }

        if (!data && avatarId) {
          const response = await fetch(`/api/avatars/${avatarId}`, { cache: "no-store" })
          const raw = await response.text()
          data = raw ? JSON.parse(raw) : null

          if (!response.ok) {
            throw new Error((data && data.error) || raw || "Unable to load story.")
          }
        }

        if (!data) {
          throw new Error("Unable to load story.")
        }

        if (cancelled) return

        if (!data.story) {
          throw new Error("Story not available yet.")
        }

        const resolvedSlug = data.story?.slug ?? slug ?? null
        setStorySlugResolved(resolvedSlug)
        setStoryRuntimeConfig(resolveStoryRuntimeConfig(data.storyRuntime))

        const normalizedAvatar = normalizeAvatar(data.avatar, resolvedSlug)

        const transformedStory = buildPersonaStory(
          normalizedAvatar.id,
          data.avatar,
          data.story,
          (data.nodes ?? []) as StoryNodePayload[],
          (data.transitions ?? []) as StoryTransitionPayload[],
        )

        if (!Object.keys(transformedStory.passages).length) {
          setCurrentStory({
            ...transformedStory,
            passages: {
              start: {
                id: "start",
                text: ["This story is still being developed. Check back soon!"],
                emotion: "neutral",
              },
            },
          })
          setCurrentPassageId("start")
          setStats(transformedStory.initialStats)
          setHiddenState({
            schoolRisk: 0,
            workRisk: 0,
            systemRisk: 0,
            supportScore: 0,
            honestyScore: 0,
          })
          return
        }

        setCurrentStory(transformedStory)
        const initialKey = transformedStory.passages["start"] ? "start" : Object.keys(transformedStory.passages)[0]
        setCurrentPassageId(initialKey)
        setStats(transformedStory.initialStats)
        setHiddenState({
          schoolRisk: 0,
          workRisk: 0,
          systemRisk: 0,
          supportScore: 0,
          honestyScore: 0,
        })
        setVisitedPassages([initialKey])
        setChoicesMade([])
        setChoiceHistory([])
        setHistoryStack([])
        setShowReflection(false)
        setShowAnalytics(false)
        setAnalyticsStep(0)
        setStatIndex(0)
        setStatPhase("entering")
        setCinematicDone(false)
        setReflectionAnswers({})
        setReflectionsSubmitted(false)
        setHasReportedCompletion(false)

        if (sessionId && resolvedSlug) {
          try {
            const res = await fetch(`/api/saves?storySlug=${encodeURIComponent(resolvedSlug)}&sessionId=${encodeURIComponent(sessionId)}`)
            if (res.ok) {
              const payload = await res.json()
              const latest = payload?.saves?.[0]
              if (latest?.currentPassageId) {
                const savedChoices = Array.isArray(latest.choicesMade) ? latest.choicesMade : []
                const hasRealProgress =
                  latest.currentPassageId !== initialKey ||
                  savedChoices.length > 0

                if (hasRealProgress) {
                  setCurrentPassageId(latest.currentPassageId)
                  setStats({
                    money:
                      typeof latest.resources?.money === "number" && Number.isFinite(latest.resources.money)
                        ? Math.max(0, latest.resources.money)
                        : transformedStory.initialStats.money,
                    health:
                      typeof latest.resources?.health === "number" && Number.isFinite(latest.resources.health)
                        ? Math.max(0, Math.min(100, latest.resources.health))
                        : transformedStory.initialStats.health,
                    time:
                      typeof latest.resources?.time === "number" && Number.isFinite(latest.resources.time)
                        ? Math.max(0, latest.resources.time)
                        : transformedStory.initialStats.time,
                  })
                  setHiddenState({
                    schoolRisk: latest.hiddenState?.schoolRisk ?? 0,
                    workRisk: latest.hiddenState?.workRisk ?? 0,
                    systemRisk: latest.hiddenState?.systemRisk ?? 0,
                    supportScore: latest.hiddenState?.supportScore ?? 0,
                    honestyScore: latest.hiddenState?.honestyScore ?? 0,
                  })
                  setVisitedPassages(latest.visitedPassages ?? [initialKey])
                  setChoicesMade(savedChoices)
                  setChoiceHistory([])
                }

                if (typeof latest.hiddenState?.audioMuted === "boolean") {
                  setAudioEnabled(!latest.hiddenState.audioMuted)
                }
                setHistoryStack([])
              }
            }
          } catch {}
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading story:", err)
          router.push("/scenarios")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStory()

    return () => {
      cancelled = true
    }
  }, [router, sessionId, storySlug])

  useEffect(() => {
    if (!currentPassageId) return
    setVisitedPassages((prev) => (prev.includes(currentPassageId) ? prev : [...prev, currentPassageId]))
  }, [currentPassageId])

  // Auto-save
  useEffect(() => {
    if (!sessionId || !storySlugResolved || !currentStory) return
    if (!currentPassageId) return
    if (isLoading) return

    const savePayload = {
      storySlug: storySlugResolved,
      storyVersion: "1.0.0",
      sessionId,
      isAutoSave: true,
      currentPassageId,
      resources: stats,
      hiddenState: {
        ...hiddenState,
        audioMuted: !audioEnabled,
      },
      visitedPassages,
      choicesMade,
      pathTaken: visitedPassages,
      completed: false,
    }

    fetch("/api/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savePayload),
    }).catch(() => {})
  }, [audioEnabled, choicesMade, currentPassageId, currentStory, hiddenState, isLoading, sessionId, stats, storySlugResolved, visitedPassages])

  const currentPassage = currentStory?.passages[currentPassageId]
  const hasChoices = currentPassage?.choices && currentPassage.choices.length > 0
  const hasNext = currentPassage?.next
  const isComplete = currentPassage && !hasChoices && !hasNext
  const canStepBack = historyStack.length > 0
  const initialTime = currentStory?.initialStats.time ?? 100
  const remainingTimeHours = Math.max(0, stats.time)
  const timeSpentHours = Math.max(0, initialTime - remainingTimeHours)
  const timeSpentForReportingHours = timeSpentHours > 0 ? timeSpentHours : 1 / 60
  const remainingTimeLabel = Number.isInteger(remainingTimeHours) ? `${remainingTimeHours}h` : `${remainingTimeHours.toFixed(1)}h`
  const totalRisk = hiddenState.schoolRisk + hiddenState.workRisk + hiddenState.systemRisk
  const completionEndingType =
    totalRisk >= 6 || stats.money <= 0 || stats.health <= 20
      ? "bad"
      : totalRisk <= 2
      ? "good"
      : "neutral"
  const riskEffects = useMemo(() => storyRuntimeConfig?.riskEffects ?? {}, [storyRuntimeConfig?.riskEffects])
  const endingChoiceIds = useMemo(() => storyRuntimeConfig?.endingChoiceIds ?? [], [storyRuntimeConfig?.endingChoiceIds])

  // Transition effect
  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 250)
    return () => clearTimeout(timer)
  }, [currentPassageId])

  useEffect(() => {
    if (isComplete && audioRef.current && !audioRef.current.paused) {
      const audio = audioRef.current
      const fadeOutDuration = 2000
      const fadeSteps = 20
      const stepTime = fadeOutDuration / fadeSteps
      const volumeStep = audio.volume / fadeSteps
      
      let currentStep = 0
      const fadeInterval = setInterval(() => {
        currentStep++
        const newVolume = Math.max(0, audio.volume - volumeStep)
        audio.volume = newVolume
        
        if (currentStep >= fadeSteps || newVolume <= 0) {
          clearInterval(fadeInterval)
          audio.pause()
        }
      }, stepTime)
      
      return () => clearInterval(fadeInterval)
    }
  }, [isComplete])

  useEffect(() => {
    if (currentPassage && hasChoices) {
      setShowChoices(true)
      setChoicesVisible(false)
      const frameId = window.requestAnimationFrame(() => {
        setChoicesVisible(true)
      })
      return () => {
        window.cancelAnimationFrame(frameId)
      }
    }

    setShowChoices(false)
    setChoicesVisible(false)
  }, [currentPassageId, currentPassage, hasChoices])

  // Preload next images
  useEffect(() => {
    if (!currentStory || !currentPassage) return

    const nextKeys = new Set<string>()
    if (currentPassage.next) nextKeys.add(currentPassage.next)
    currentPassage.choices?.forEach((choice) => {
      if (choice.leads_to) nextKeys.add(choice.leads_to)
    })

    const nextImages = Array.from(nextKeys)
      .map((key) => currentStory.passages[key]?.image)
      .filter((url): url is string => Boolean(url))

    if (!nextImages.length) return

    const createdLinks: HTMLLinkElement[] = []

    nextImages.forEach((url) => {
      if (document.head.querySelector(`link[rel="preload"][href="${url}"]`)) return

      const link = document.createElement("link")
      link.rel = "preload"
      link.as = "image"
      link.href = url
      document.head.appendChild(link)
      createdLinks.push(link)
    })

    if (!createdLinks.length) return

    const timeoutId = window.setTimeout(() => {
      createdLinks.forEach((link) => link.remove())
    }, 30000)

    return () => {
      window.clearTimeout(timeoutId)
      createdLinks.forEach((link) => link.remove())
    }
  }, [currentStory, currentPassage])

  // Report completion
  useEffect(() => {
    if (!currentStory || !currentPassage || !isComplete || hasReportedCompletion) return

    const controller = new AbortController()

    fetch("/api/journeys/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: currentStory.avatarId,
        scenario: {
          title: currentStory.title,
          description: currentStory.theme,
        },
      }),
      signal: controller.signal,
    })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Failed to sync scenario completion", err)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setHasReportedCompletion(true)
        }
      })

    return () => controller.abort()
  }, [currentStory, currentPassage, isComplete, hasReportedCompletion])

  const pickEnding = useCallback(
    (nextStats: { money: number; health: number }, nextHidden: typeof hiddenState) => {
      const totalRisk = nextHidden.schoolRisk + nextHidden.workRisk + nextHidden.systemRisk
      if (totalRisk >= 6 || nextStats.money <= 0 || nextStats.health <= 20) {
        return "ending-crisis"
      }
      if (totalRisk <= 2) {
        return "ending-quiet-hope"
      }
      return "ending-mixed"
    },
    [],
  )

  const applyChoiceOutcome = useCallback(
    (
      choiceId: string,
      choiceLabel: string,
      leadsTo: string | undefined,
      effects?: StoryChoice["effects"],
      kind: "choice" | "continue" = "choice",
    ) => {
      if (!leadsTo) return
      const snapshot: HistoryEntry = {
        passageId: currentPassageId,
        stats: { ...stats },
        hiddenState: { ...hiddenState },
        visitedPassages: [...visitedPassages],
        choicesMade: [...choicesMade],
        choiceHistory: [...choiceHistory],
        hasReportedCompletion,
      }
      setHistoryStack((prev) => [...prev, snapshot])

      const resolvedEffects = effects ?? {}
      const updatedStats = {
        money: Math.max(0, stats.money + (resolvedEffects.money ?? 0)),
        health: Math.max(0, Math.min(100, stats.health + (resolvedEffects.health ?? 0))),
        time: Math.max(0, stats.time + (resolvedEffects.time ?? 0)),
      }

      const riskEffect = riskEffects[choiceId] ?? {}
      const updatedHidden = {
        schoolRisk: hiddenState.schoolRisk + (riskEffect.schoolRisk ?? 0),
        workRisk: hiddenState.workRisk + (riskEffect.workRisk ?? 0),
        systemRisk: hiddenState.systemRisk + (riskEffect.systemRisk ?? 0),
        supportScore: hiddenState.supportScore + (riskEffect.supportScore ?? 0),
        honestyScore: hiddenState.honestyScore + (riskEffect.honestyScore ?? 0),
      }

      setStats(updatedStats)
      setHiddenState(updatedHidden)

      const nextPassageId = endingChoiceIds.includes(choiceId) ? pickEnding(updatedStats, updatedHidden) : leadsTo
      setChoicesMade((prev) => [...prev, choiceId])
      setChoiceHistory((prev) => [
        ...prev,
        {
          from: currentPassageId,
          to: nextPassageId,
          label: choiceLabel,
          effects,
          kind,
        },
      ])
      setCurrentPassageId(nextPassageId)
    },
    [
      choiceHistory,
      choicesMade,
      currentPassageId,
      endingChoiceIds,
      hasReportedCompletion,
      hiddenState,
      pickEnding,
      riskEffects,
      stats,
      visitedPassages,
    ],
  )

  const handleChoice = useCallback(
    (choice: StoryChoice) => {
      applyChoiceOutcome(choice.id, choice.text ?? "Choice", choice.leads_to, choice.effects, "choice")
    },
    [applyChoiceOutcome],
  )

  const handleContinue = useCallback(() => {
    if (!currentPassage?.next) return
    const choiceId = currentPassage.nextChoiceId ?? `${currentPassage.id}-continue`
    applyChoiceOutcome(choiceId, "Continue", currentPassage.next, currentPassage.nextEffects, "continue")
  }, [applyChoiceOutcome, currentPassage])

  const handleStepBack = useCallback(() => {
    const previous = historyStack[historyStack.length - 1]
    if (!previous) return
    setHistoryStack((prev) => prev.slice(0, -1))
    setCurrentPassageId(previous.passageId)
    setStats(previous.stats)
    setHiddenState(previous.hiddenState)
    setVisitedPassages(previous.visitedPassages)
    setChoicesMade(previous.choicesMade)
    setChoiceHistory(previous.choiceHistory)
    setHasReportedCompletion(previous.hasReportedCompletion)
  }, [historyStack])

  const handleRestart = useCallback(async () => {
    if (currentStory) {
      if (sessionId && storySlugResolved) {
        try {
          await fetch(`/api/saves?storySlug=${encodeURIComponent(storySlugResolved)}&sessionId=${encodeURIComponent(sessionId)}`, {
            method: "DELETE",
          })
        } catch {}
      }
      
      const initialKey = currentStory.passages["start"] ? "start" : Object.keys(currentStory.passages)[0]
      setCurrentPassageId(initialKey)
      setStats(currentStory.initialStats)
      setHiddenState({
        schoolRisk: 0,
        workRisk: 0,
        systemRisk: 0,
        supportScore: 0,
        honestyScore: 0,
      })
      setVisitedPassages([initialKey])
      setChoicesMade([])
      setChoiceHistory([])
      setHistoryStack([])
      setShowReflection(false)
      setShowAnalytics(false)
      setAnalyticsStep(0)
      setStatIndex(0)
      setStatPhase("entering")
      setCinematicDone(false)
      setReflectionAnswers({})
      setReflectionsSubmitted(false)
      setHasReportedCompletion(false)
      
      if (audioRef.current && audioEnabled && audioConfig) {
        audioRef.current.volume = audioConfig.volume
        audioRef.current.play().catch(() => {})
      }
    }
  }, [currentStory, sessionId, storySlugResolved, audioEnabled, audioConfig])

  const handleReflectionChange = (questionId: string, value: string) => {
    setReflectionAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const reflectionQuestions = storyRuntimeConfig?.reflectionQuestions ?? []
  const openReflectionQuestion = storyRuntimeConfig?.openReflectionQuestion
  const analyticsStats = useMemo(
    () =>
      (storyRuntimeConfig?.postReflectionStats ?? []).map((stat) => ({
        ...stat,
        icon: postReflectionIconMap[stat.icon] ?? Users,
      })),
    [storyRuntimeConfig?.postReflectionStats],
  )
  const analyticsStatsCount = analyticsStats.length
  const hasReflectionStep = reflectionQuestions.length > 0 || Boolean(openReflectionQuestion)
  const methodologySources = storyRuntimeConfig?.methodology?.sources ?? []
  const methodologyNote =
    storyRuntimeConfig?.methodology?.note?.trim() ||
    storyRuntimeConfig?.methodologyText?.trim() ||
    "All statistics reflect peer-reviewed research and government data. Player choices are anonymized, aggregated for comparison only, and not stored beyond this session."
  const resourceLinks = storyRuntimeConfig?.resourceLinks ?? []
  const hasMethodologyContent =
    methodologySources.length > 0 || Boolean(storyRuntimeConfig?.methodologyText?.trim())
  const hasAnalyticsContent =
      analyticsStatsCount > 0 ||
      resourceLinks.length > 0 ||
      hasMethodologyContent
  const canShowReflection = hasReflectionStep && hasAnalyticsContent
  const requiredReflectionIds = canShowReflection ? storyRuntimeConfig?.requiredReflectionIds ?? [] : []
  const requiredAnsweredCount = requiredReflectionIds.filter((id) => reflectionAnswers[id]).length
  const requiredTotalCount = requiredReflectionIds.length
  const allReflectionsAnswered = requiredTotalCount === 0 ? true : requiredAnsweredCount === requiredTotalCount

  // Analytics stat carousel auto-advance 
  useEffect(() => {
    if (!showAnalytics || analyticsStep !== 0 || cinematicDone) return
    if (analyticsStatsCount === 0) return

    if (statPhase === "entering") {
      const t = setTimeout(() => {
        if (statIndex >= analyticsStatsCount - 1) {
          setCinematicDone(true)
        } else {
          setStatPhase("exiting")
        }
      }, cinematicHold)
      return () => clearTimeout(t)
    }
    if (statPhase === "exiting") {
      const t = setTimeout(() => {
        setStatIndex((prev) => prev + 1)
        setStatPhase("entering")
      }, cinematicExitDuration)
      return () => clearTimeout(t)
    }
  }, [analyticsStatsCount, showAnalytics, analyticsStep, statPhase, statIndex, cinematicDone])

  const handleSubmitReflections = useCallback(async () => {
    if (!sessionId || !storySlugResolved || !allReflectionsAnswered) return
    if (!canShowReflection) {
      setReflectionsSubmitted(true)
      return
    }
    
    setSubmittingReflections(true)
    
    try {
      await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: storySlugResolved,
          storyVersion: "1.0.0",
          sessionId,
          endingId: currentPassageId,
          endingType: completionEndingType,
          finalResources: stats,
          finalHiddenState: hiddenState,
          totalChoices: choicesMade.length,
          totalTime: timeSpentForReportingHours,
          pathTaken: visitedPassages,
          choicesMade,
          reflectionResponses: reflectionAnswers,
        }),
      })
      
      await fetch(`/api/saves?storySlug=${encodeURIComponent(storySlugResolved)}&sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      })
      
      setReflectionsSubmitted(true)
    } catch {
      setReflectionsSubmitted(true)
    } finally {
      setSubmittingReflections(false)
    }
  }, [
    sessionId,
    storySlugResolved,
    allReflectionsAnswered,
    currentPassageId,
    stats,
    visitedPassages,
    choicesMade,
    hiddenState,
    reflectionAnswers,
    canShowReflection,
    completionEndingType,
    timeSpentForReportingHours,
  ])

  const handleViewAnalytics = useCallback(async () => {
    if (!allReflectionsAnswered) return
    if (!reflectionsSubmitted) {
      await handleSubmitReflections()
    }
    setAnalyticsStep(0)
    setStatIndex(0)
    setStatPhase("entering")
    setCinematicDone(false)
    setShowAnalytics(true)
  }, [allReflectionsAnswered, handleSubmitReflections, reflectionsSubmitted])

  const toggleAudio = () => {
    if (!hasStoryAudio) return
    const newState = !audioEnabled
    setAudioEnabled(newState)
    if (typeof window !== "undefined") {
      localStorage.setItem("loop_audio_muted", String(!newState))
    }
  }

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

  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner />
        <LoadingText>Loading story...</LoadingText>
      </LoadingContainer>
    )
  }

  if (!currentStory || !currentPassage) {
    return (
      <LoadingContainer>
        <Spinner />
        <LoadingText>Preparing your story...</LoadingText>
      </LoadingContainer>
    )
  }

  if (stats.money <= 0) {
    return (
      <CinematicScreen>
        <CinematicBg $url={resolveBackdropImage(currentPassage.image)} />
        <CinematicOverlay $tint="linear-gradient(to bottom, rgba(127,29,29,0.3), rgba(15,23,42,0.92))" />
        <CinematicContent>
          <CinematicCard>
            <GameOverIcon $color="#f87171">
              <DollarSign size={32} />
            </GameOverIcon>
            <GameOverTitle>Out of Money</GameOverTitle>
            <GameOverText>
              Without any funds left, the journey cannot continue. This is the reality many people face when
              unexpected costs arise.
            </GameOverText>
            <ReplayButton onClick={handleRestart}>
              <RotateCcw size={16} />
              Try Again
            </ReplayButton>
          </CinematicCard>
        </CinematicContent>
      </CinematicScreen>
    )
  }

  if (stats.health <= 0) {
    return (
      <CinematicScreen>
        <CinematicBg $url={resolveBackdropImage(currentPassage.image)} />
        <CinematicOverlay $tint="linear-gradient(to bottom, rgba(127,29,29,0.3), rgba(15,23,42,0.92))" />
        <CinematicContent>
          <CinematicCard>
            <GameOverIcon $color="#f87171">
              <Heart size={32} />
            </GameOverIcon>
            <GameOverTitle>Health Crisis</GameOverTitle>
            <GameOverText>
              The physical and emotional toll has become too much. Rest and recovery must take priority over everything
              else.
            </GameOverText>
            <ReplayButton onClick={handleRestart}>
              <RotateCcw size={16} />
              Try Again
            </ReplayButton>
          </CinematicCard>
        </CinematicContent>
      </CinematicScreen>
    )
  }

  if (stats.time <= 0) {
    return (
      <CinematicScreen>
        <CinematicBg $url={resolveBackdropImage(currentPassage.image)} />
        <CinematicOverlay />
        <CinematicContent>
          <CinematicCard>
            <GameOverIcon $color="#60a5fa">
              <Clock size={32} />
            </GameOverIcon>
            <GameOverTitle>Out of Time</GameOverTitle>
            <GameOverText>
              There are only so many hours in a day. When every moment is spoken for, something has to give. This is
              the impossible math many caregivers face.
            </GameOverText>
            <ReplayButton onClick={handleRestart}>
              <RotateCcw size={16} />
              Try Again
            </ReplayButton>
          </CinematicCard>
        </CinematicContent>
      </CinematicScreen>
    )
  }

  if (isComplete && !showReflection) {
    const primaryAction = canShowReflection ? (
      <ContinueButton onClick={() => setShowReflection(true)} style={{ width: "100%" }}>
        Continue to Reflection
        <ChevronRight size={18} />
      </ContinueButton>
    ) : hasAnalyticsContent ? (
      <ContinueButton onClick={handleViewAnalytics} style={{ width: "100%" }}>
        View Real-World Data
        <ChevronRight size={18} />
      </ContinueButton>
    ) : (
      <ButtonRow>
        <ReplayButton onClick={handleRestart}>
          <RotateCcw size={16} />
          Experience Again
        </ReplayButton>
        <ContinueButton onClick={() => router.push("/scenarios")}>
          Explore More Stories
          <ChevronRight size={18} />
        </ContinueButton>
      </ButtonRow>
    )

    return (
      <CinematicScreen>
        <CinematicBg $url={resolveBackdropImage(currentPassage.image)} />
        <CinematicOverlay />
        <CinematicContent>
          <CinematicAvatar>
            <OptimizedStoryImage src={currentStory.avatarImage} alt={currentStory.avatarName} width={72} height={72} sizes="72px" />
          </CinematicAvatar>
          <CinematicCard>
            <CompletionTitle>Story Complete</CompletionTitle>
            <CompletionText>
              You navigated {currentStory.avatarName}&apos;s challenging week, making choices that shaped their path forward.
            </CompletionText>
            <StatsRow>
              <StatTile $accent="#4ade80">
                <DollarSign size={16} />
                <div>
                  ${stats.money} <StatTileLabel>remaining</StatTileLabel>
                </div>
              </StatTile>
              <StatTile $accent="#f87171">
                <Heart size={16} />
                <div>
                  {stats.health}% <StatTileLabel>health</StatTileLabel>
                </div>
              </StatTile>
              <StatTile $accent="#60a5fa">
                <Clock size={16} />
                <div>
                  {formatHoursAndMinutesFromHours(remainingTimeHours)} <StatTileLabel>time left</StatTileLabel>
                </div>
              </StatTile>
            </StatsRow>
            {primaryAction}
          </CinematicCard>
        </CinematicContent>
      </CinematicScreen>
    )
  }

  if (isComplete && showReflection && !showAnalytics && canShowReflection) {
    const canViewAnalytics = allReflectionsAnswered && !submittingReflections

    return (
      <CinematicScreen
        style={{
          minHeight: "100vh",
          height: "auto",
          overflowY: "auto",
          alignItems: "flex-start",
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}
      >
        <CinematicBg $url={resolveBackdropImage(currentPassage.image)} />
        <CinematicOverlay />
        <CinematicContent>
          <CompletionTitle>Take a Moment to Reflect</CompletionTitle>
          <ReflectionIntroText>
            Consider the weight of the choices you made as {currentStory.avatarName}.
          </ReflectionIntroText>

          <ReflectionCard>
            <ReflectionTitle>Your Reflections</ReflectionTitle>

            {reflectionQuestions.map((question, index) => (
              <ReflectionQuestion key={question.id}>
                <QuestionText>
                  <QuestionNumber>{index + 1}</QuestionNumber>
                  {question.prompt}
                </QuestionText>
                <ReflectionOptions>
                  {question.options.map((option) => (
                    <ReflectionOption
                      key={`${question.id}:${option}`}
                      $selected={reflectionAnswers[question.id] === option}
                      onClick={() => handleReflectionChange(question.id, option)}
                    >
                      {option}
                    </ReflectionOption>
                  ))}
                </ReflectionOptions>
              </ReflectionQuestion>
            ))}

            {openReflectionQuestion && (
              <ReflectionQuestion>
                <QuestionText>
                  <QuestionNumber>{reflectionQuestions.length + 1}</QuestionNumber>
                  {openReflectionQuestion.prompt}
                </QuestionText>
                <OpenEndedInput
                  placeholder={openReflectionQuestion.placeholder}
                  value={reflectionAnswers[openReflectionQuestion.id] ?? ""}
                  onChange={(event) => handleReflectionChange(openReflectionQuestion.id, event.target.value)}
                />
              </ReflectionQuestion>
            )}
          </ReflectionCard>

          <ButtonRow>
            <ReplayButton onClick={handleRestart}>
              <RotateCcw size={16} />
              Try Again
            </ReplayButton>

            <ContinueButton
              onClick={handleViewAnalytics}
              $disabled={!canViewAnalytics}
            >
              <BarChart3 size={16} />
              View Real-World Data
            </ContinueButton>
          </ButtonRow>

          {!allReflectionsAnswered && (
            <ReflectionHint>
              Answer all {requiredTotalCount} questions to unlock the data dashboard
            </ReflectionHint>
          )}
        </CinematicContent>
      </CinematicScreen>
    )
  }

  if (isComplete && showAnalytics) {
    // No stats, skip directly to action step
    if (analyticsStats.length === 0) {
      return (
        <AnalyticsScreen $centered style={{ overflowY: "auto", alignItems: "flex-start", paddingTop: "3rem", paddingBottom: "3rem" }}>
          <AnalyticsBg />
          <AnalyticsBody>
            <SectionTitle $marginBottom="0.5rem">How You Can Help</SectionTitle>
            <ActionSubtitle>
              Understanding is the first step. Here are ways to make a real difference.
            </ActionSubtitle>

            <ActionGrid>
              {simulationAnalyticsDefaults.action.cards.map((card) => {
                const Icon = analyticsActionIconMap[card.icon]
                return (
                  <ActionCard key={card.title} $accent={card.color}>
                    <ActionCardIcon $color={card.color}>
                      <Icon size={22} />
                    </ActionCardIcon>
                    <ActionCardTitle>{card.title}</ActionCardTitle>
                    <ActionCardDesc>{card.body}</ActionCardDesc>
                  </ActionCard>
                )
              })}
            </ActionGrid>

            {resourceLinks.length > 0 && (
              <>
                <OrgLabel>Organizations Making a Difference</OrgLabel>
                <OrgGrid>
                  {resourceLinks.map((link) => (
                    <ResourceLink key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </ResourceLink>
                  ))}
                </OrgGrid>
              </>
            )}

            {hasMethodologyContent && (
              <MethodologyBox>
                <MethodologyHeader>
                  <MethodologyIconWrapper>
                    <Shield size={16} />
                  </MethodologyIconWrapper>
                  <MethodologyTitle>Data & Methodology</MethodologyTitle>
                </MethodologyHeader>
                {methodologySources.length > 0 && (
                  <MethodologyGrid>
                    {methodologySources.map((source, index) => (
                      <MethodologySourceItem key={`${source.label}-${index}`}>
                        <MethodologySourceLabel>{source.label}</MethodologySourceLabel>
                        <MethodologySourceValue>{source.value}</MethodologySourceValue>
                      </MethodologySourceItem>
                    ))}
                  </MethodologyGrid>
                )}
                <MethodologyNote>{methodologyNote}</MethodologyNote>
              </MethodologyBox>
            )}

            <ButtonRow>
              <ReplayButton onClick={handleRestart}>
                <RotateCcw size={16} />
                Experience Again
              </ReplayButton>
              <ContinueButton onClick={() => router.push("/scenarios")}>
                Explore More Stories
                <ChevronRight size={16} />
              </ContinueButton>
            </ButtonRow>
          </AnalyticsBody>
        </AnalyticsScreen>
      )
    }

    // Step 0: Cinematic stat carousel 
    if (analyticsStep === 0) {
      const currentStat = analyticsStats[statIndex]
      const IconComponent = currentStat.icon

      return (
        <AnalyticsScreen $centered>
          <AnalyticsBg />
          {[15, 35, 55, 75, 85].map((x, i) => (
            <Particle key={i} $x={x} $delay={i * 0.6} $color={currentStat.color} />
          ))}
          <CinematicStage>
            {statPhase === "exiting" ? (
              <CinematicStatExiting key={`exit-${statIndex}`}>
                <CinematicIconRing $color={currentStat.color}>
                  <IconComponent size={38} />
                </CinematicIconRing>
                <CinematicStatValue>{currentStat.value}</CinematicStatValue>
                <CinematicStatLabel>{currentStat.title}</CinematicStatLabel>
                <CinematicStatDesc>{currentStat.description}</CinematicStatDesc>
                <CinematicStatSource>Source: {currentStat.source}</CinematicStatSource>
              </CinematicStatExiting>
            ) : (
              <CinematicStatEntering key={`enter-${statIndex}`}>
                <CinematicIconRing $color={currentStat.color}>
                  <IconComponent size={38} />
                </CinematicIconRing>
                <CinematicStatValue>{currentStat.value}</CinematicStatValue>
                <CinematicStatLabel>{currentStat.title}</CinematicStatLabel>
                <CinematicStatDesc>{currentStat.description}</CinematicStatDesc>
                <CinematicStatSource>Source: {currentStat.source}</CinematicStatSource>
              </CinematicStatEntering>
            )}

            {cinematicDone && (
              <CinematicContinueWrap>
                <ContinueButton onClick={() => setAnalyticsStep(3)}>
                  How You Can Help
                  <ChevronRight size={16} />
                </ContinueButton>
              </CinematicContinueWrap>
            )}
          </CinematicStage>

          <CinematicProgress>
            <ProgressTimerBar key={`timer-${statIndex}`} $duration={cinematicHold} />
            <ProgressDots>
              {analyticsStats.map((_, i) => (
                <ProgressDot
                  key={i}
                  $state={i < statIndex ? "done" : i === statIndex ? "active" : "upcoming"}
                />
              ))}
            </ProgressDots>
            {!cinematicDone && (
              <SkipBtn onClick={() => { setCinematicDone(true); setStatIndex(analyticsStats.length - 1); setStatPhase("visible") }}>
                Skip
              </SkipBtn>
            )}
          </CinematicProgress>
        </AnalyticsScreen>
      )
    }

    // Step 3: How You Can Help
    if (analyticsStep >= 2) {
      return (
        <AnalyticsScreen $centered style={{ overflowY: "auto", alignItems: "flex-start", paddingTop: "3rem", paddingBottom: "3rem" }}>
          <AnalyticsBg />
          <AnalyticsBody>
            <SectionTitle $marginBottom="0.5rem">How You Can Help</SectionTitle>
            <ActionSubtitle>
              Understanding is the first step. Here are ways to make a real difference.
            </ActionSubtitle>

            <ActionGrid>
              {simulationAnalyticsDefaults.action.cards.map((card) => {
                const Icon = analyticsActionIconMap[card.icon]
                return (
                  <ActionCard key={card.title} $accent={card.color}>
                    <ActionCardIcon $color={card.color}>
                      <Icon size={22} />
                    </ActionCardIcon>
                    <ActionCardTitle>{card.title}</ActionCardTitle>
                    <ActionCardDesc>{card.body}</ActionCardDesc>
                  </ActionCard>
                )
              })}
            </ActionGrid>

            {resourceLinks.length > 0 && (
              <>
                <OrgLabel>Organizations Making a Difference</OrgLabel>
                <OrgGrid>
                  {resourceLinks.map((link) => (
                    <ResourceLink key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </ResourceLink>
                  ))}
                </OrgGrid>
              </>
            )}

            {hasMethodologyContent && (
              <MethodologyBox>
                <MethodologyHeader>
                  <MethodologyIconWrapper>
                    <Shield size={16} />
                  </MethodologyIconWrapper>
                  <MethodologyTitle>Data & Methodology</MethodologyTitle>
                </MethodologyHeader>
                {methodologySources.length > 0 && (
                  <MethodologyGrid>
                    {methodologySources.map((source, index) => (
                      <MethodologySourceItem key={`${source.label}-${index}`}>
                        <MethodologySourceLabel>{source.label}</MethodologySourceLabel>
                        <MethodologySourceValue>{source.value}</MethodologySourceValue>
                      </MethodologySourceItem>
                    ))}
                  </MethodologyGrid>
                )}
                <MethodologyNote>{methodologyNote}</MethodologyNote>
              </MethodologyBox>
            )}

            <ButtonRow>
              <ReplayButton onClick={handleRestart}>
                <RotateCcw size={16} />
                Experience Again
              </ReplayButton>
              <ContinueButton onClick={() => router.push("/scenarios")}>
                Explore More Stories
                <ChevronRight size={16} />
              </ContinueButton>
            </ButtonRow>
          </AnalyticsBody>
        </AnalyticsScreen>
      )
    }
  }
  
  const textContent = Array.isArray(currentPassage.text) ? currentPassage.text : [currentPassage.text]
  const passageImage = resolveBackdropImage(currentPassage.image)
  const hasBackgroundImage = isStoryVisualPath(passageImage)
  const shouldPrioritizeBackground = historyStack.length === 0

  return (
    <Container>
      <BackgroundLayer>
        <BackgroundFallback />
        {hasBackgroundImage && (
          <BackgroundImageLayer>
            <OptimizedStoryImage
              src={passageImage}
              alt={currentPassage.title ?? "Story background"}
              fill
              priority={shouldPrioritizeBackground}
              sizes="100vw"
            />
          </BackgroundImageLayer>
        )}
        <GradientOverlay />
      </BackgroundLayer>

      <TopBar>
        <BackButton onClick={() => router.push("/")}>
          <ArrowLeft size={16} />
          Exit
        </BackButton>
        
        <TopBarCenter>{currentStory.title}</TopBarCenter>
        
        <TopBarRight>
          <StatsBar>
            <StatPill $color="#60a5fa">
              <Clock />{remainingTimeLabel}
            </StatPill>
            <StatPill $color="#4ade80">
              <DollarSign />${stats.money}
            </StatPill>
            <StatPill $color="#f87171">
              <Heart />{stats.health}%
            </StatPill>
          </StatsBar>
          <AudioButton
            $active={audioEnabled && hasStoryAudio}
            $disabled={!hasStoryAudio}
            onClick={toggleAudio}
            disabled={!hasStoryAudio}
            title={hasStoryAudio ? (audioEnabled ? "Mute audio" : "Enable audio") : "Audio unavailable for this story"}
          >
            {audioEnabled && hasStoryAudio ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </AudioButton>
        </TopBarRight>
      </TopBar>

      <ContentArea>
        <TextBox key={currentPassageId} $transitioning={isTransitioning}>
          <TextBoxHeader>
            <CharacterAvatar>
              <OptimizedStoryImage
                src={currentStory.avatarImage}
                alt={currentStory.avatarName}
                width={44}
                height={44}
                sizes="44px"
              />
            </CharacterAvatar>
            <CharacterInfo>
              <CharacterName>{currentStory.avatarName}</CharacterName>
              {currentPassage.title && <PassageTitle>{currentPassage.title}</PassageTitle>}
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
              <p key={i}>{text}</p>
            ))}
          </NarrativeText>
        </TextBox>

        {hasChoices && showChoices && (
          <ChoicesContainer $visible={choicesVisible}>
            <ChoicesGrid>
              {currentPassage.choices!.map((choice, index) => (
                <ChoiceButton
                  key={choice.id}
                  $index={index}
                  $visible={choicesVisible}
                  onClick={() => handleChoice(choice)}
                >
                  <ChoiceText>{choice.text}</ChoiceText>
                  {choice.effects && (
                    <ChoiceEffects>
                      {choice.effects.money !== undefined && renderEffectTag('money', choice.effects.money)}
                      {choice.effects.health !== undefined && renderEffectTag('health', choice.effects.health)}
                      {choice.effects.time !== undefined && renderEffectTag('time', choice.effects.time)}
                    </ChoiceEffects>
                  )}
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
    </Container>
  )
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <LoadingContainer>
          <Spinner />
          <LoadingText>Loading...</LoadingText>
        </LoadingContainer>
      }
    >
      <SimulationContent />
    </Suspense>
  )
}
