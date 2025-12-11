"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styled, { keyframes } from "styled-components"
import {
  Heart,
  Clock,
  DollarSign,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Home,
  Brain,
  CheckCircle2,
} from "lucide-react"
import type { Avatar, AvatarAppearance, Resources, SocialContext } from "@/types/simulation"

interface StoryChoice {
  id: string
  text: string
  leads_to: string
  effects?: { money?: number; health?: number; time?: number; mentalHealth?: number; support?: number }
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
  stats: { money: number; health: number; mentalHealth: number; support: number; time: number }
  hiddenState: {
    schoolRisk: number
    workRisk: number
    systemRisk: number
    supportScore: number
    honestyScore: number
  }
  visitedPassages: string[]
  choicesMade: string[]
  hasReportedCompletion: boolean
}

// Audio configuration for stories, supports multiple slug variants
const STORY_AUDIO_CONFIG: Record<string, { path: string; volume: number }> = {
  "katrina-mahinay": {
    path: "/audios/Katrina.mp3",
    volume: 0.3,
  },
  "katrina": {
    path: "/audios/Katrina.mp3",
    volume: 0.3,
  },
  "katrina-story": {
    path: "/audios/Katrina.mp3",
    volume: 0.3,
  },
}

// Helper to find audio config by partial match
function getAudioConfig(slug: string | null): { path: string; volume: number } | null {
  if (!slug) return null
  
  // Direct match first
  if (STORY_AUDIO_CONFIG[slug]) {
    return STORY_AUDIO_CONFIG[slug]
  }
  
  // Try partial match (slug contains key or key contains slug)
  const lowerSlug = slug.toLowerCase()
  for (const [key, config] of Object.entries(STORY_AUDIO_CONFIG)) {
    if (lowerSlug.includes(key) || key.includes(lowerSlug)) {
      return config
    }
  }
  
  if (lowerSlug.includes("katrina")) {
    return STORY_AUDIO_CONFIG["katrina-mahinay"]
  }
  
  return null
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
  
  @media (max-width: 640px) {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    svg { width: 12px; height: 12px; }
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
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  font-weight: 600;
  background: ${({ $positive }) => ($positive ? "rgba(34, 197, 94, 0.22)" : "rgba(239, 68, 68, 0.22)")};
  color: ${({ $positive }) => ($positive ? "#86efac" : "#fca5a5")};
  border: 1px solid ${({ $positive }) => ($positive ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)")};
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

const GameOverTitle = styled.h2`
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #f87171;
`

const CompletionTitle = styled.h2`
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #c4b5fd;
`

const ScreenText = styled.p`
  font-size: 1.05rem;
  color: #94a3b8;
  margin-bottom: 2rem;
  max-width: 500px;
  line-height: 1.65;
`

const FinalStats = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
`

const FinalStatItem = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(51, 65, 85, 0.5);
  padding: 0.625rem 1rem;
  border-radius: 0.625rem;
  color: #e2e8f0;
  font-size: 0.9rem;
  
  svg {
    color: ${({ $color }) => $color || "#94a3b8"};
  }
`

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: #8b5cf6;
  border: none;
  border-radius: 0.625rem;
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #7c3aed; transform: scale(1.02); }
`

const HomeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: rgba(51, 65, 85, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 0.625rem;
  color: #e2e8f0;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { 
    background: rgba(71, 85, 105, 0.6); 
    border-color: rgba(139, 92, 246, 0.4);
    transform: scale(1.02); 
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`

const ReflectionBox = styled.div`
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 1rem;
  padding: 1.75rem;
  max-width: 550px;
  width: 100%;
  margin-bottom: 2rem;
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
  &:last-child { margin-bottom: 0; }
`

const QuestionText = styled.p`
  color: #e2e8f0;
  font-size: 0.95rem;
  margin-bottom: 0.625rem;
  line-height: 1.5;
`

const ReflectionOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`

const ReflectionOption = styled.button<{ $selected: boolean }>`
  padding: 0.4rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  border: 1px solid ${({ $selected }) => ($selected ? "#8b5cf6" : "rgba(71, 85, 105, 0.5)")};
  background: ${({ $selected }) => ($selected ? "rgba(139, 92, 246, 0.2)" : "rgba(51, 65, 85, 0.3)")};
  color: ${({ $selected }) => ($selected ? "#c4b5fd" : "#94a3b8")};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #8b5cf6;
    color: #c4b5fd;
  }
`

const SubmitButton = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: ${({ $disabled }) => $disabled 
    ? "rgba(51, 65, 85, 0.5)" 
    : "linear-gradient(135deg, #10b981, #059669)"};
  border: 1px solid ${({ $disabled }) => $disabled 
    ? "rgba(71, 85, 105, 0.5)" 
    : "rgba(16, 185, 129, 0.5)"};
  border-radius: 0.75rem;
  color: ${({ $disabled }) => $disabled ? "#64748b" : "white"};
  font-size: 1rem;
  font-weight: 600;
  cursor: ${({ $disabled }) => $disabled ? "not-allowed" : "pointer"};
  transition: all 0.2s;
  box-shadow: ${({ $disabled }) => $disabled 
    ? "none" 
    : "0 4px 16px -4px rgba(16, 185, 129, 0.4)"};
  
  &:hover:not(:disabled) { 
    transform: ${({ $disabled }) => $disabled ? "none" : "scale(1.02)"};
    box-shadow: ${({ $disabled }) => $disabled 
      ? "none" 
      : "0 8px 24px -8px rgba(16, 185, 129, 0.5)"};
  }
`

const SubmittedMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 0.75rem;
  color: #34d399;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
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

// Get avatar profile image based on avatar ID
function getAvatarProfileImage(avatarId: string, fallback: string): string {
  const id = avatarId.toLowerCase()
  
  if (id.includes("katrina")) {
    return "/scenes/katrina-profile.png"
  }
  
  return fallback
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
  initialStats: { money: number; health: number; mentalHealth: number; support: number; time: number }
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
    if (typeof effects.mentalHealth === "number" && Number.isFinite(effects.mentalHealth)) {
      normalized.mentalHealth = effects.mentalHealth
    }
    if (typeof effects.support === "number" && Number.isFinite(effects.support)) {
      normalized.support = effects.support
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
    
    const visualValue = typeof media.visual === "string" ? media.visual : (typeof media.image === "string" ? media.image : null)
    const audioValue = typeof media.audio === "string" ? media.audio : (typeof (media as any).soundEffect === "string" ? (media as any).soundEffect : null)
    
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

  return {
    avatarId,
    title: story?.title ?? "",
    theme: story?.summary ?? "",
    avatarImage: getAvatarProfileImage(avatarId, fallbackImage),
    avatarName: avatar?.name && String(avatar.name).trim().length > 0 ? avatar.name : story?.title ?? "Character",
    initialStats: {
      money: typeof initialResources.money === "number" ? initialResources.money : 500,
      health:
        typeof initialResources.physicalHealth === "number"
          ? initialResources.physicalHealth
          : typeof initialResources.mentalHealth === "number"
            ? initialResources.mentalHealth
            : 100,
      mentalHealth:
        typeof initialResources.mentalHealth === "number"
          ? initialResources.mentalHealth
          : typeof initialResources.physicalHealth === "number"
            ? initialResources.physicalHealth
            : 100,
      support:
        typeof initialResources.socialSupport === "number"
          ? initialResources.socialSupport
          : 50,
      time: typeof initialResources.time === "number" && initialResources.time > 0 ? initialResources.time : 100,
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
  const [currentPassageId, setCurrentPassageId] = useState<string>("start")
  const [stats, setStats] = useState({ money: 500, health: 100, mentalHealth: 100, support: 50, time: 100 })
  const [showChoices, setShowChoices] = useState(false)
  const [choicesVisible, setChoicesVisible] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({})
  const [reflectionsSubmitted, setReflectionsSubmitted] = useState(false)
  const [submittingReflections, setSubmittingReflections] = useState(false)
  const [hasReportedCompletion, setHasReportedCompletion] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [hiddenState, setHiddenState] = useState({
    schoolRisk: 0,
    workRisk: 0,
    systemRisk: 0,
    supportScore: 0,
    honestyScore: 0,
  })
  const [visitedPassages, setVisitedPassages] = useState<string[]>([])
  const [choicesMade, setChoicesMade] = useState<string[]>([])
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([])

  // Global background audio: plays when story loads
  useEffect(() => {
    if (!storySlugResolved || !currentStory || isLoading) return
    if (audioInitialized) return 

    const audioConfig = getAudioConfig(storySlugResolved)
    
    console.log("Audio init check:", { 
      storySlugResolved, 
      audioConfig,
      audioEnabled,
      isLoading 
    })
    
    if (!audioConfig) {
      console.log("No audio config found for story slug:", storySlugResolved)
      return
    }

    const startAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      console.log("Creating audio element with path:", audioConfig.path)
      
      const audio = new Audio(audioConfig.path)
      audio.loop = true
      audio.volume = audioConfig.volume
      audioRef.current = audio
      
      // Add event listeners for debugging
      audio.addEventListener('canplaythrough', () => {
        console.log("Audio can play through")
      })
      
      audio.addEventListener('error', (e) => {
        console.error("Audio error:", e, audio.error)
      })
      
      audio.addEventListener('playing', () => {
        console.log("Audio is now playing")
      })

      if (audioEnabled) {
        console.log("Attempting to play audio...")
        audio.play()
          .then(() => {
            console.log("Audio playback started successfully")
          })
          .catch((err) => {
            console.warn("Audio autoplay blocked:", err)
            // Audio will start on first user interaction
          })
      }
      
      setAudioInitialized(true)
    }

    startAudio()

    return () => {
    }
  }, [storySlugResolved, currentStory, isLoading, audioInitialized, audioEnabled])

  // Handle audio enable/disable toggle
  useEffect(() => {
    if (!audioRef.current) return

    if (audioEnabled) {
      audioRef.current.play().catch((err) => {
        console.warn("Audio play failed:", err)
      })
    } else {
      audioRef.current.pause()
    }
  }, [audioEnabled])

  // Try to play audio on first user interaction (browsers block autoplay)
  useEffect(() => {
    const tryPlayAudio = () => {
      if (audioRef.current && audioEnabled && audioRef.current.paused) {
        console.log("User interaction detected, trying to play audio...")
        audioRef.current.play()
          .then(() => console.log("Audio started after user interaction"))
          .catch((err) => console.warn("Still cannot play:", err))
      }
    }
    
    // Add listeners for common interactions
    document.addEventListener('click', tryPlayAudio, { once: true })
    document.addEventListener('keydown', tryPlayAudio, { once: true })
    document.addEventListener('touchstart', tryPlayAudio, { once: true })
    
    return () => {
      document.removeEventListener('click', tryPlayAudio)
      document.removeEventListener('keydown', tryPlayAudio)
      document.removeEventListener('touchstart', tryPlayAudio)
    }
  }, [audioEnabled, audioInitialized])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Ensure we have a local session id for anonymous saves
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

  // Load mute preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    const savedMute = localStorage.getItem("loop_audio_muted")
    if (savedMute === "true") {
      setAudioEnabled(false)
    }
  }, [])

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
          } catch (err) {
            console.warn("Story fetch failed, trying avatar fallback:", err)
          }
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
            supportScore: transformedStory.initialStats.support ?? 0,
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
          supportScore: transformedStory.initialStats.support ?? 0,
          honestyScore: 0,
        })
        setVisitedPassages([initialKey])
        setChoicesMade([])
        setHistoryStack([])
        setHasReportedCompletion(false)

        if (sessionId && resolvedSlug) {
          try {
            const res = await fetch(`/api/saves?storySlug=${encodeURIComponent(resolvedSlug)}&sessionId=${encodeURIComponent(sessionId)}`)
            if (res.ok) {
              const payload = await res.json()
              const latest = payload?.saves?.[0]
              if (latest?.currentPassageId) {
                setCurrentPassageId(latest.currentPassageId)
                setStats({
                  money: latest.resources?.money ?? transformedStory.initialStats.money,
                  health: latest.resources?.health ?? transformedStory.initialStats.health,
                  mentalHealth: latest.resources?.mentalHealth ?? transformedStory.initialStats.mentalHealth,
                  support: latest.resources?.support ?? transformedStory.initialStats.support,
                  time: latest.resources?.time ?? transformedStory.initialStats.time,
                })
                setHiddenState({
                  schoolRisk: latest.hiddenState?.schoolRisk ?? 0,
                  workRisk: latest.hiddenState?.workRisk ?? 0,
                  systemRisk: latest.hiddenState?.systemRisk ?? 0,
                  supportScore: latest.hiddenState?.supportScore ?? (latest.resources?.support ?? 0),
                  honestyScore: latest.hiddenState?.honestyScore ?? 0,
                })
                setVisitedPassages(latest.visitedPassages ?? [initialKey])
                setChoicesMade(latest.choicesMade ?? [])
                // Restore mute state from save if available
                if (typeof latest.hiddenState?.audioMuted === "boolean") {
                  setAudioEnabled(!latest.hiddenState.audioMuted)
                }
                setHistoryStack([])
              }
            }
          } catch (e) {
            console.warn("Could not load save state", e)
          }
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

  // Track visited passages for saving
  useEffect(() => {
    if (!currentPassageId) return
    setVisitedPassages((prev) => (prev.includes(currentPassageId) ? prev : [...prev, currentPassageId]))
  }, [currentPassageId])

  // Auto-save progress once beyond initial load (includes audioMuted state)
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
        audioMuted: !audioEnabled, // Save mute state
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
    }).catch((err) => console.warn("Auto-save failed", err))
  }, [audioEnabled, choicesMade, currentPassageId, currentStory, hiddenState, isLoading, sessionId, stats, storySlugResolved, visitedPassages])

  const currentPassage = currentStory?.passages[currentPassageId]
  const hasChoices = currentPassage?.choices && currentPassage.choices.length > 0
  const hasNext = currentPassage?.next
  const isComplete = currentPassage && !hasChoices && !hasNext
  const canStepBack = historyStack.length > 0

  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 250)
    return () => clearTimeout(timer)
  }, [currentPassageId])

  // Stop audio with fade out when story completes
  useEffect(() => {
    if (isComplete && audioRef.current && !audioRef.current.paused) {
      const audio = audioRef.current
      const fadeOutDuration = 2000 // 2 seconds
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
          console.log("Audio faded out - story complete")
        }
      }, stepTime)
      
      return () => clearInterval(fadeInterval)
    }
  }, [isComplete])

  useEffect(() => {
    if (currentPassage && hasChoices) {
      setShowChoices(false)
      setChoicesVisible(false)
      const timer1 = setTimeout(() => setShowChoices(true), 800)
      const timer2 = setTimeout(() => setChoicesVisible(true), 1000)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [currentPassageId, currentPassage, hasChoices])

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

  const RISK_EFFECTS: Record<
    string,
    Partial<{
      schoolRisk: number
      workRisk: number
      systemRisk: number
      supportScore: number
      honestyScore: number
    }>
  > = {
    "hide-letter": { systemRisk: 1, honestyScore: -1 },
    "tell-miko": { supportScore: 1, honestyScore: 1 },
    "tell-both": { systemRisk: -1, supportScore: 2, honestyScore: 2 },
    "choose-school": { schoolRisk: -2, workRisk: 1 },
    "choose-work": { schoolRisk: 2, workRisk: -1 },
    "juggle-both": { schoolRisk: -1, workRisk: -1 },
    "stay-home": { schoolRisk: 1, systemRisk: 1 },
    "promise-fix": {},
    "soft-truth-teacher": { schoolRisk: -1, supportScore: 1, honestyScore: 1 },
    "avoid-meeting": { schoolRisk: 1, systemRisk: 1 },
    "ask-help": { schoolRisk: -2, supportScore: 2, honestyScore: 1 },
    downplay: { honestyScore: -1 },
    "leave-early": { schoolRisk: 1, systemRisk: 1 },
    "work-quietly": { workRisk: -1 },
    "ask-more-hours": { schoolRisk: 1, workRisk: -1 },
    "ask-fewer-hours": { schoolRisk: -1, workRisk: 1 },
    "promise-better": { workRisk: -1 },
    "be-honest-boss": { workRisk: -1, supportScore: 1, honestyScore: 1 },
    "keep-cleaning": { systemRisk: -1 },
    "vague-reply": { supportScore: 1 },
    "tell-truth-friends": { supportScore: 2, honestyScore: 1 },
    "ignore-friends": { supportScore: -1 },
  }

  const ENDING_CHOICE_IDS = ["plan-next-week", "call-mom", "sit-in-silence"]

  const pickEnding = useCallback(
    (nextStats: { money: number; health: number; mentalHealth: number }, nextHidden: typeof hiddenState) => {
      const totalRisk = nextHidden.schoolRisk + nextHidden.workRisk + nextHidden.systemRisk
      if (totalRisk >= 6 || nextStats.money <= 0 || nextStats.health <= 20 || nextStats.mentalHealth <= 20) {
        return "ending-crisis"
      }
      if (totalRisk <= 2 && nextHidden.supportScore >= 4) {
        return "ending-quiet-hope"
      }
      return "ending-mixed"
    },
    [],
  )

  const applyChoiceOutcome = useCallback(
    (choiceId: string, leadsTo: string | undefined, effects?: StoryChoice["effects"]) => {
      if (!leadsTo) return
      const snapshot: HistoryEntry = {
        passageId: currentPassageId,
        stats: { ...stats },
        hiddenState: { ...hiddenState },
        visitedPassages: [...visitedPassages],
        choicesMade: [...choicesMade],
        hasReportedCompletion,
      }
      setHistoryStack((prev) => [...prev, snapshot])

      const resolvedEffects = effects ?? {}
      const updatedStats = {
        money: Math.max(0, stats.money + (resolvedEffects.money ?? 0)),
        health: Math.max(0, Math.min(100, stats.health + (resolvedEffects.health ?? 0))),
        mentalHealth: Math.max(0, Math.min(100, stats.mentalHealth + (resolvedEffects.mentalHealth ?? 0))),
        support: Math.max(0, Math.min(100, stats.support + (resolvedEffects.support ?? 0))),
        time: Math.max(0, stats.time - (resolvedEffects.time ?? 0)),
      }

      const riskEffect = RISK_EFFECTS[choiceId] ?? {}
      const updatedHidden = {
        schoolRisk: hiddenState.schoolRisk + (riskEffect.schoolRisk ?? 0),
        workRisk: hiddenState.workRisk + (riskEffect.workRisk ?? 0),
        systemRisk: hiddenState.systemRisk + (riskEffect.systemRisk ?? 0),
        supportScore: hiddenState.supportScore + (riskEffect.supportScore ?? 0),
        honestyScore: hiddenState.honestyScore + (riskEffect.honestyScore ?? 0),
      }

      setStats(updatedStats)
      setHiddenState(updatedHidden)

      const nextPassageId = ENDING_CHOICE_IDS.includes(choiceId) ? pickEnding(updatedStats, updatedHidden) : leadsTo
      setChoicesMade((prev) => [...prev, choiceId])
      setCurrentPassageId(nextPassageId)
    },
    [choicesMade, currentPassageId, hasReportedCompletion, hiddenState, pickEnding, stats, visitedPassages],
  )

  const handleChoice = useCallback(
    (choice: StoryChoice) => {
      applyChoiceOutcome(choice.id, choice.leads_to, choice.effects)
    },
    [applyChoiceOutcome],
  )

  const handleContinue = useCallback(() => {
    if (!currentPassage?.next) return
    const choiceId = currentPassage.nextChoiceId ?? `${currentPassage.id}-continue`
    applyChoiceOutcome(choiceId, currentPassage.next, currentPassage.nextEffects)
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
    setHasReportedCompletion(previous.hasReportedCompletion)
  }, [historyStack])

  const handleRestart = useCallback(async () => {
    if (currentStory) {
      // Clear the existing save 
      if (sessionId && storySlugResolved) {
        try {
          await fetch(`/api/saves?storySlug=${encodeURIComponent(storySlugResolved)}&sessionId=${encodeURIComponent(sessionId)}`, {
            method: "DELETE",
          })
        } catch (err) {
          console.warn("Failed to clear save on restart:", err)
        }
      }
      
      const initialKey = currentStory.passages["start"] ? "start" : Object.keys(currentStory.passages)[0]
      setCurrentPassageId(initialKey)
      setStats(currentStory.initialStats)
      setHiddenState({
        schoolRisk: 0,
        workRisk: 0,
        systemRisk: 0,
        supportScore: currentStory.initialStats.support ?? 0,
        honestyScore: 0,
      })
      setVisitedPassages([initialKey])
      setChoicesMade([])
      setHistoryStack([])
      setShowReflection(false)
      setReflectionAnswers({})
      setReflectionsSubmitted(false)
      setHasReportedCompletion(false)
      
      // Resume audio if enabled 
      if (audioRef.current && audioEnabled) {
        const audioConfig = getAudioConfig(storySlugResolved)
        if (audioConfig) {
          audioRef.current.volume = audioConfig.volume
        }
        audioRef.current.play().catch((err) => {
          console.warn("Failed to resume audio on restart:", err)
        })
      }
    }
  }, [currentStory, sessionId, storySlugResolved, audioEnabled])

  const handleReflectionSelect = (question: string, answer: string) => {
    setReflectionAnswers((prev) => ({ ...prev, [question]: answer }))
  }

  const allReflectionsAnswered = Object.keys(reflectionAnswers).length >= 3

  const handleSubmitReflections = useCallback(async () => {
    if (!sessionId || !storySlugResolved || !allReflectionsAnswered) return
    
    setSubmittingReflections(true)
    
    try {
      // Record the completion with reflection data
      await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: storySlugResolved,
          storyVersion: "1.0.0",
          sessionId,
          endingId: currentPassageId,
          endingType: hiddenState.systemRisk > 50 ? "bad" : hiddenState.supportScore > 50 ? "good" : "neutral",
          finalResources: stats,
          finalHiddenState: hiddenState,
          totalChoices: choicesMade.length,
          totalTime: stats.time || 0,
          pathTaken: visitedPassages,
          choicesMade,
          reflectionResponses: reflectionAnswers,
        }),
      })
      
      // Delete the save after recording completion
      await fetch(`/api/saves?storySlug=${encodeURIComponent(storySlugResolved)}&sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      })
      
      console.log("Reflections submitted and save cleared")
      setReflectionsSubmitted(true)
    } catch (err) {
      console.warn("Failed to submit reflections:", err)
      // Still mark as submitted so user can navigate
      setReflectionsSubmitted(true)
    } finally {
      setSubmittingReflections(false)
    }
  }, [sessionId, storySlugResolved, currentPassageId, stats, visitedPassages, choicesMade, hiddenState, reflectionAnswers, allReflectionsAnswered])

  const toggleAudio = () => {
    const newState = !audioEnabled
    setAudioEnabled(newState)
    // Persist mute preference
    if (typeof window !== "undefined") {
      localStorage.setItem("loop_audio_muted", String(!newState))
    }
  }

  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner />
        <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Loading story...</p>
      </LoadingContainer>
    )
  }

  if (!currentStory || !currentPassage) {
    return (
      <LoadingContainer>
        <Spinner />
        <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Preparing your story...</p>
      </LoadingContainer>
    )
  }

  if (stats.money <= 0) {
    return (
      <Container>
        <FullScreenBox>
          <DollarSign size={56} style={{ color: "#f87171", marginBottom: "1.25rem" }} />
          <GameOverTitle>Out of Resources</GameOverTitle>
          <ScreenText>
            Without financial resources, the journey cannot continue. This is the reality many people face when
            unexpected costs arise.
          </ScreenText>
          <ActionButton onClick={handleRestart}>
            <RotateCcw size={18} />
            Try Again
          </ActionButton>
        </FullScreenBox>
      </Container>
    )
  }

  if (stats.health <= 0) {
    return (
      <Container>
        <FullScreenBox>
          <Heart size={56} style={{ color: "#f87171", marginBottom: "1.25rem" }} />
          <GameOverTitle>Health Crisis</GameOverTitle>
          <ScreenText>
            The physical and emotional toll has become too much. Rest and recovery must take priority over everything
            else.
          </ScreenText>
          <ActionButton onClick={handleRestart}>
            <RotateCcw size={18} />
            Try Again
          </ActionButton>
        </FullScreenBox>
      </Container>
    )
  }

  if (stats.mentalHealth <= 0) {
    return (
      <Container>
        <FullScreenBox>
          <Brain size={56} style={{ color: "#a78bfa", marginBottom: "1.25rem" }} />
          <GameOverTitle>Overwhelmed</GameOverTitle>
          <ScreenText>
            The weight of everything has become too much to carry alone. Taking a pause and asking for help can be a
            brave next step.
          </ScreenText>
          <ActionButton onClick={handleRestart}>
            <RotateCcw size={18} />
            Try Again
          </ActionButton>
        </FullScreenBox>
      </Container>
    )
  }

  if (stats.time <= 0) {
    return (
      <Container>
        <FullScreenBox>
          <Clock size={56} style={{ color: "#60a5fa", marginBottom: "1.25rem" }} />
          <GameOverTitle>Out of Time</GameOverTitle>
          <ScreenText>
            There are only so many hours in a day. When every moment is spoken for, something has to give.
            This is the impossible math many caregivers face.
          </ScreenText>
          <ActionButton onClick={handleRestart}>
            <RotateCcw size={18} />
            Try Again
          </ActionButton>
        </FullScreenBox>
      </Container>
    )
  }

  if (isComplete && !showReflection) {
    return (
      <Container>
        <FullScreenBox>
          <Heart size={44} style={{ color: "#c4b5fd", marginBottom: "1rem" }} />
          <CompletionTitle>Story Complete</CompletionTitle>
          <ScreenText>
            You experienced {currentStory.avatarName}&apos;s journey. Every choice shaped their path.
          </ScreenText>
          <FinalStats>
            <FinalStatItem $color="#60a5fa">
              <Clock size={18} />
              <span>{stats.time}h remaining</span>
            </FinalStatItem>
            <FinalStatItem $color="#4ade80">
              <DollarSign size={18} />
              <span>${stats.money} left</span>
            </FinalStatItem>
            <FinalStatItem $color="#f87171">
              <Heart size={18} />
              <span>{stats.health}% health</span>
            </FinalStatItem>
          </FinalStats>
          <ContinueButton onClick={() => setShowReflection(true)}>
            Continue to Reflection
            <ChevronRight size={18} />
          </ContinueButton>
        </FullScreenBox>
      </Container>
    )
  }

  if (isComplete && showReflection) {
    return (
      <Container>
        <FullScreenBox>
          <CompletionTitle>Take a Moment to Reflect</CompletionTitle>
          <ScreenText>How did this experience make you feel? There are no right or wrong answers.</ScreenText>

          <ReflectionBox>
            <ReflectionTitle>Your Reflections</ReflectionTitle>

            <ReflectionQuestion>
              <QuestionText>How did you feel during this experience?</QuestionText>
              <ReflectionOptions>
                {["Anxious", "Frustrated", "Empathetic", "Curious", "Moved"].map((option) => (
                  <ReflectionOption
                    key={option}
                    $selected={reflectionAnswers["feeling"] === option}
                    onClick={() => handleReflectionSelect("feeling", option)}
                  >
                    {option}
                  </ReflectionOption>
                ))}
              </ReflectionOptions>
            </ReflectionQuestion>

            <ReflectionQuestion>
              <QuestionText>What surprised you most?</QuestionText>
              <ReflectionOptions>
                {["The costs involved", "The time required", "The lack of support", "The emotional toll", "Nothing"].map(
                  (option) => (
                    <ReflectionOption
                      key={option}
                      $selected={reflectionAnswers["surprise"] === option}
                      onClick={() => handleReflectionSelect("surprise", option)}
                    >
                      {option}
                    </ReflectionOption>
                  ),
                )}
              </ReflectionOptions>
            </ReflectionQuestion>

            <ReflectionQuestion>
              <QuestionText>After this experience, I feel more aware of...</QuestionText>
              <ReflectionOptions>
                {["Daily challenges others face", "Hidden costs", "Importance of community", "Systemic barriers", "My own privileges"].map(
                  (option) => (
                    <ReflectionOption
                      key={option}
                      $selected={reflectionAnswers["awareness"] === option}
                      onClick={() => handleReflectionSelect("awareness", option)}
                    >
                      {option}
                    </ReflectionOption>
                  ),
                )}
              </ReflectionOptions>
            </ReflectionQuestion>
          </ReflectionBox>

          {/* Show submit button before submission */}
          {!reflectionsSubmitted && (
            <>
              <SubmitButton 
                $disabled={!allReflectionsAnswered || submittingReflections}
                onClick={handleSubmitReflections}
                disabled={!allReflectionsAnswered || submittingReflections}
              >
                {submittingReflections ? (
                  <>
                    <Spinner style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Submit Reflections
                  </>
                )}
              </SubmitButton>
              
              {!allReflectionsAnswered && (
                <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.75rem" }}>
                  Please answer all reflection questions to submit
                </p>
              )}
            </>
          )}

          {/* Show navigation buttons after submission */}
          {reflectionsSubmitted && (
            <>
              <SubmittedMessage>
                <CheckCircle2 size={18} />
                Your reflections have been saved. Thank you for sharing!
              </SubmittedMessage>
              
              <ButtonGroup>
                <HomeButton onClick={() => router.push("/")}>
                  <Home size={18} />
                  Home
                </HomeButton>
                
                <ActionButton onClick={handleRestart}>
                  <RotateCcw size={18} />
                  Experience Again
                </ActionButton>

                <ContinueButton onClick={() => router.push("/scenarios")}>
                  Explore More Stories
                  <ChevronRight size={18} />
                </ContinueButton>
              </ButtonGroup>
            </>
          )}
        </FullScreenBox>
      </Container>
    )
  }
  
  const textContent = Array.isArray(currentPassage.text) ? currentPassage.text : [currentPassage.text]
  const passageImage = currentPassage.image || ""
  const hasBackgroundImage = !!currentPassage.image && !currentPassage.image.includes("placeholder")

  return (
    <Container>
      {/* Background Layer: Full screen, prominent */}
      <BackgroundLayer>
        <BackgroundImage $url={passageImage} $hasImage={hasBackgroundImage} />
        <GradientOverlay />
      </BackgroundLayer>

      {/* Top Bar: Minimal stats */}
      <TopBar>
        <BackButton onClick={() => router.push("/scenarios")}>
          <ArrowLeft size={16} />
          Exit
        </BackButton>
        
        <TopBarCenter>{currentStory.title}</TopBarCenter>
        
        <TopBarRight>
          <StatsBar>
            <StatPill $color="#60a5fa">
              <Clock />{stats.time}h
            </StatPill>
            <StatPill $color="#4ade80">
              <DollarSign />${stats.money}
            </StatPill>
            <StatPill $color="#f87171">
              <Heart />{stats.health}%
            </StatPill>
          </StatsBar>
          <AudioButton $active={audioEnabled} onClick={toggleAudio} title={audioEnabled ? "Mute audio" : "Enable audio"}>
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </AudioButton>
        </TopBarRight>
      </TopBar>

      {/* Bottom Content Area: Visual Novel Style */}
      <ContentArea>
        <TextBox key={currentPassageId} $transitioning={isTransitioning}>
          <TextBoxHeader>
            <CharacterAvatar>
              <img src={currentStory.avatarImage} alt={currentStory.avatarName} />
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

        {/* Choices */}
        {hasChoices && (
          <ChoicesContainer $visible={showChoices}>
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
                      {choice.effects.money !== undefined && choice.effects.money !== 0 && (
                        <EffectTag $positive={choice.effects.money > 0}>
                          {choice.effects.money > 0 ? "+" : ""}${choice.effects.money}
                        </EffectTag>
                      )}
                      {choice.effects.health !== undefined && choice.effects.health !== 0 && (
                        <EffectTag $positive={choice.effects.health > 0}>
                          {choice.effects.health > 0 ? "+" : ""}
                          {choice.effects.health} HP
                        </EffectTag>
                      )}
                      {choice.effects.mentalHealth !== undefined && choice.effects.mentalHealth !== 0 && (
                        <EffectTag $positive={choice.effects.mentalHealth > 0}>
                          {choice.effects.mentalHealth > 0 ? "+" : ""}
                          {choice.effects.mentalHealth} MH
                        </EffectTag>
                      )}
                      {choice.effects.support !== undefined && choice.effects.support !== 0 && (
                        <EffectTag $positive={choice.effects.support > 0}>
                          {choice.effects.support > 0 ? "+" : ""}
                          {choice.effects.support} sup
                        </EffectTag>
                      )}
                      {choice.effects.time !== undefined && choice.effects.time !== 0 && (
                        <EffectTag $positive={choice.effects.time > 0}>
                          {choice.effects.time > 0 ? "+" : ""}
                          {choice.effects.time}m
                        </EffectTag>
                      )}
                    </ChoiceEffects>
                  )}
                </ChoiceButton>
              ))}
            </ChoicesGrid>
          </ChoicesContainer>
        )}

        {/* Continue Button */}
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
          <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Loading...</p>
        </LoadingContainer>
      }
    >
      <SimulationContent />
    </Suspense>
  )
}