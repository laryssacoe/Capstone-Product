"use client"

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styled, { keyframes } from "styled-components"
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
  Volume2,
  VolumeX,
} from "lucide-react"
import type { Avatar, AvatarAppearance, Resources, SocialContext } from "@/types/simulation"
import OptimizedStoryImage from "@/components/optimized-story-image"
import { resolveStoryRuntimeConfig, type PostReflectionStatIconKey, type StoryRuntimeConfig } from "@/lib/story-runtime-config"
import { simulationAnalyticsDefaults, type SimulationAnalyticsActionIcon } from "@/lib/simulation-analytics-defaults"

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
  return runtimeConfig?.backgroundAudio?.path ? runtimeConfig.backgroundAudio : null
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

const CompletionBox = styled.div`
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
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #c4b5fd;
`

const CompletionText = styled.p`
  font-size: 1.125rem;
  color: #94a3b8;
  margin-bottom: 2rem;
  max-width: 600px;
  line-height: 1.6;
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
  gap: 24px;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
`

const FinalStatItem = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(51, 65, 85, 0.5);
  padding: 0.625rem 1rem;
  border-radius: 0.625rem;
  color: #e2e8f0;
  font-size: 0.95rem;
  
  svg {
    color: ${({ $color }) => $color || "#94a3b8"};
  }
`

const ReplayButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: #8b5cf6;
  border: none;
  border-radius: 0.75rem;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #7c3aed;
    transform: scale(1.02);
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

const OpenEndedInput = styled.textarea`
  width: 100%;
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

const AnalyticsContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom, #0f172a, #1e1b4b);
  color: #e2e8f0;
  padding: 2rem;
  overflow-y: auto;
`

const AnalyticsTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #c4b5fd;
  margin-bottom: 0.75rem;
`

const AnalyticsSubtitle = styled.p`
  color: #94a3b8;
  font-size: 1.1rem;
  line-height: 1.6;
`

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 1.5rem;
  text-align: center;
`

const ComparisonSection = styled.div`
  max-width: 900px;
  margin: 0 auto 3rem auto;
`

const ComparisonCard = styled.div`
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 1.5rem;
`

const ComparisonTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #c4b5fd;
  margin-bottom: 1rem;
`

const ComparisonBar = styled.div`
  margin-bottom: 1.25rem;
`

const ComparisonLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
`

const ComparisonTrack = styled.div`
  height: 8px;
  background: rgba(51, 65, 85, 0.5);
  border-radius: 4px;
  overflow: hidden;
`

const ComparisonFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 1s ease;
`

const InsightBox = styled.div`
  background: rgba(139, 92, 246, 0.1);
  border-left: 3px solid #8b5cf6;
  padding: 1rem 1.25rem;
  border-radius: 0 0.5rem 0.5rem 0;
  margin-top: 1rem;
`

const InsightText = styled.p`
  font-size: 0.9rem;
  color: #c4b5fd;
  line-height: 1.6;
`

const ResourcesSection = styled.div`
  max-width: 800px;
  margin: 0 auto 2rem auto;
  text-align: center;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 1rem;
  padding: 1.5rem;
`

const ResourcesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`

const ResourceLink = styled.a`
  display: block;
  padding: 1rem;
  background: rgba(51, 65, 85, 0.4);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 0.75rem;
  color: #94a3b8;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.3);
    color: #c4b5fd;
  }
`

const MethodologySection = styled.div`
  max-width: 800px;
  margin: 0 auto 3rem auto;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 1rem;
  padding: 2rem;
`

const MethodologyText = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
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
  width: 48px;
  height: 48px;
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

function getAvatarProfileImage(fallback: string): string {
  if (fallback && (
    fallback.startsWith("/scenes/") ||
    fallback.includes("cloudinary.com") ||
    fallback.includes("res.cloudinary.com")
  )) {
    return fallback
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
    avatarImage: getAvatarProfileImage(fallbackImage),
    avatarName: avatar?.name && String(avatar.name).trim().length > 0 ? avatar.name : story?.title ?? "Character",
    initialStats: {
      money: typeof initialResources.money === "number" ? initialResources.money : 500,
      health: typeof initialResources.health === "number" ? initialResources.health : 100,
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
  const [storyRuntimeConfig, setStoryRuntimeConfig] = useState<StoryRuntimeConfig | null>(null)
  const [currentPassageId, setCurrentPassageId] = useState<string>("start")
  const [stats, setStats] = useState({ money: 500, health: 100, time: 100 })
  const [showChoices, setShowChoices] = useState(false)
  const [choicesVisible, setChoicesVisible] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsStep, setAnalyticsStep] = useState(0)
  const [statIndex, setStatIndex] = useState(0)
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
  const [choiceHistory, setChoiceHistory] = useState<ChoiceRecord[]>([])
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([])

  // Global background audio: plays when story loads
  useEffect(() => {
    if (!storySlugResolved || !currentStory || isLoading) return
    if (audioInitialized) return 

    const audioConfig = getAudioConfig(storyRuntimeConfig)
        
    if (!audioConfig) return

    const startAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      
      const audio = new Audio(audioConfig.path)
      audio.loop = true
      audio.volume = audioConfig.volume
      audioRef.current = audio
      
      if (audioEnabled) {
        audio.play()
          .catch(() => {
            // Audio will start on first user interaction.
          })
      }
      
      setAudioInitialized(true)
    }

    startAudio()

    return () => {
    }
  }, [storySlugResolved, currentStory, isLoading, audioInitialized, audioEnabled, storyRuntimeConfig])

  // Handle audio enable/disable toggle
  useEffect(() => {
    if (!audioRef.current) return

    if (audioEnabled) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [audioEnabled])

  // Try to play audio on first user interaction (browsers block autoplay)
  useEffect(() => {
    const tryPlayAudio = () => {
      if (audioRef.current && audioEnabled && audioRef.current.paused) {
        audioRef.current.play()
          .catch(() => {})
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
          } catch {
            // Continue with avatar fallback.
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
                setCurrentPassageId(latest.currentPassageId)
                setStats({
                  money: latest.resources?.money ?? transformedStory.initialStats.money,
                  health: latest.resources?.health ?? transformedStory.initialStats.health,
                  time: latest.resources?.time ?? transformedStory.initialStats.time,
                })
                setHiddenState({
                  schoolRisk: latest.hiddenState?.schoolRisk ?? 0,
                  workRisk: latest.hiddenState?.workRisk ?? 0,
                  systemRisk: latest.hiddenState?.systemRisk ?? 0,
                  supportScore: latest.hiddenState?.supportScore ?? 0,
                  honestyScore: latest.hiddenState?.honestyScore ?? 0,
                })
                setVisitedPassages(latest.visitedPassages ?? [initialKey])
                setChoicesMade(latest.choicesMade ?? [])
                setChoiceHistory([])
                // Restore mute state from save if available
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
    }).catch(() => {})
  }, [audioEnabled, choicesMade, currentPassageId, currentStory, hiddenState, isLoading, sessionId, stats, storySlugResolved, visitedPassages])

  const currentPassage = currentStory?.passages[currentPassageId]
  const hasChoices = currentPassage?.choices && currentPassage.choices.length > 0
  const hasNext = currentPassage?.next
  const isComplete = currentPassage && !hasChoices && !hasNext
  const canStepBack = historyStack.length > 0
  const supportValue = hiddenState.supportScore
  const initialTime = currentStory?.initialStats.time ?? 100
  const timeSpent = Math.max(0, initialTime - stats.time)
  const totalRisk = hiddenState.schoolRisk + hiddenState.workRisk + hiddenState.systemRisk
  const completionEndingType =
    totalRisk >= 6 || stats.money <= 0 || stats.health <= 20
      ? "bad"
      : totalRisk <= 2 && hiddenState.supportScore >= 4
      ? "good"
      : "neutral"
  const moneyComparisonMax = Math.max(currentStory?.initialStats.money ?? 0, stats.money, 1)

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

  const riskEffects = useMemo(() => storyRuntimeConfig?.riskEffects ?? {}, [storyRuntimeConfig?.riskEffects])
  const endingChoiceIds = useMemo(() => storyRuntimeConfig?.endingChoiceIds ?? [], [storyRuntimeConfig?.endingChoiceIds])

  const pickEnding = useCallback(
    (nextStats: { money: number; health: number }, nextHidden: typeof hiddenState) => {
      const totalRisk = nextHidden.schoolRisk + nextHidden.workRisk + nextHidden.systemRisk
      if (totalRisk >= 6 || nextStats.money <= 0 || nextStats.health <= 20) {
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
      // Clear the existing save 
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
      setReflectionAnswers({})
      setReflectionsSubmitted(false)
      setHasReportedCompletion(false)
      
      // Resume audio if enabled 
      if (audioRef.current && audioEnabled) {
        const audioConfig = getAudioConfig(storyRuntimeConfig)
        if (audioConfig) {
          audioRef.current.volume = audioConfig.volume
        }
        audioRef.current.play().catch(() => {})
      }
    }
  }, [currentStory, sessionId, storySlugResolved, audioEnabled, storyRuntimeConfig])

  const handleReflectionChange = (questionId: string, value: string) => {
    setReflectionAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const reflectionQuestions = storyRuntimeConfig?.reflectionQuestions ?? []
  const openReflectionQuestion = storyRuntimeConfig?.openReflectionQuestion
  const hasReflectionStep = reflectionQuestions.length > 0 || Boolean(openReflectionQuestion)
  const hasAnalyticsContent =
    (storyRuntimeConfig?.postReflectionStats?.length ?? 0) > 0 ||
    (storyRuntimeConfig?.resourceLinks?.length ?? 0) > 0 ||
    Boolean(storyRuntimeConfig?.methodologyText)
  const canShowReflection = hasReflectionStep && hasAnalyticsContent
  const requiredReflectionIds = canShowReflection ? storyRuntimeConfig?.requiredReflectionIds ?? [] : []
  const requiredAnsweredCount = requiredReflectionIds.filter((id) => reflectionAnswers[id]).length
  const requiredTotalCount = requiredReflectionIds.length
  const allReflectionsAnswered = requiredTotalCount === 0 ? true : requiredAnsweredCount === requiredTotalCount

  const handleSubmitReflections = useCallback(async () => {
    if (!sessionId || !storySlugResolved || !allReflectionsAnswered) return
    if (!canShowReflection) {
      setReflectionsSubmitted(true)
      return
    }
    
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
          endingType: completionEndingType,
          finalResources: stats,
          finalHiddenState: hiddenState,
          totalChoices: choicesMade.length,
          totalTime: timeSpent,
          pathTaken: visitedPassages,
          choicesMade,
          reflectionResponses: reflectionAnswers,
        }),
      })
      
      // Delete the save after recording completion
      await fetch(`/api/saves?storySlug=${encodeURIComponent(storySlugResolved)}&sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      })
      
      setReflectionsSubmitted(true)
    } catch {
      // Still mark as submitted so user can navigate
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
    timeSpent,
  ])

  const handleViewAnalytics = useCallback(async () => {
    if (!allReflectionsAnswered) return
    if (!reflectionsSubmitted) {
      await handleSubmitReflections()
    }
    setAnalyticsStep(0)
    setStatIndex(0)
    setShowAnalytics(true)
  }, [allReflectionsAnswered, handleSubmitReflections, reflectionsSubmitted])

  const toggleAudio = () => {
    const newState = !audioEnabled
    setAudioEnabled(newState)
    // Persist mute preference
    if (typeof window !== "undefined") {
      localStorage.setItem("loop_audio_muted", String(!newState))
    }
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
    const primaryAction = canShowReflection ? (
      <ContinueButton onClick={() => setShowReflection(true)}>
        Continue to Reflection
        <ChevronRight size={18} />
      </ContinueButton>
    ) : hasAnalyticsContent ? (
      <ContinueButton onClick={handleViewAnalytics}>
        View Real-World Data
        <ChevronRight size={18} />
      </ContinueButton>
    ) : (
      <ContinueButton onClick={() => router.push("/scenarios")}>
        Explore More Stories
        <ChevronRight size={18} />
      </ContinueButton>
    )

    return (
      <Container>
        <CompletionBox>
          <Heart size={44} style={{ color: "#c4b5fd", marginBottom: "1rem" }} />
          <CompletionTitle>Story Complete</CompletionTitle>
          <CompletionText>
            You navigated {currentStory.avatarName}&apos;s journey, making difficult choices that shaped this outcome.
          </CompletionText>
          <FinalStats>
            <FinalStatItem $color="#60a5fa">
              <Clock size={18} />
              <span>~{timeSpent} min spent</span>
            </FinalStatItem>
            <FinalStatItem $color="#4ade80">
              <DollarSign size={18} />
              <span>Final: ${stats.money}</span>
            </FinalStatItem>
            <FinalStatItem $color="#f87171">
              <Heart size={18} />
              <span>Health: {stats.health}%</span>
            </FinalStatItem>
            <FinalStatItem $color="#c084fc">
              <Users size={18} />
              <span>Support: {supportValue}/100</span>
            </FinalStatItem>
          </FinalStats>
          {primaryAction}
        </CompletionBox>
      </Container>
    )
  }

  if (isComplete && showAnalytics) {
    const analyticsStats = (storyRuntimeConfig?.postReflectionStats ?? []).map((stat) => ({
      ...stat,
      icon: postReflectionIconMap[stat.icon] ?? Users,
    }))

    if (analyticsStats.length === 0 && analyticsStep <= 1) {
      return (
        <AnalyticsContainer style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: "640px", animation: "fadeIn 0.8s ease" }}>
            <AnalyticsTitle style={{ marginBottom: "0.75rem" }}>{simulationAnalyticsDefaults.noStats.title}</AnalyticsTitle>
            <AnalyticsSubtitle style={{ marginBottom: "2rem" }}>
              {simulationAnalyticsDefaults.noStats.subtitle}
            </AnalyticsSubtitle>
            <ContinueButton onClick={() => setAnalyticsStep(3)} style={{ margin: "0 auto" }}>
              {simulationAnalyticsDefaults.noStats.continueLabel}
              <ChevronRight size={18} />
            </ContinueButton>
          </div>
        </AnalyticsContainer>
      )
    }

    if (analyticsStep === 0) {
      return (
        <AnalyticsContainer style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: "600px", animation: "fadeIn 1s ease" }}>
            <BarChart3 size={64} style={{ color: "#8b5cf6", marginBottom: "1.5rem" }} />
            <AnalyticsTitle style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
              {simulationAnalyticsDefaults.intro.title}
            </AnalyticsTitle>
            <AnalyticsSubtitle style={{ fontSize: "1.25rem", marginBottom: "2.5rem" }}>
              {simulationAnalyticsDefaults.intro.subtitle}
            </AnalyticsSubtitle>
            <ContinueButton onClick={() => setAnalyticsStep(1)} style={{ margin: "0 auto" }}>
              {simulationAnalyticsDefaults.intro.ctaLabel}
              <ChevronRight size={18} />
            </ContinueButton>
          </div>
        </AnalyticsContainer>
      )
    }

    if (analyticsStep === 1) {
      const currentStat = analyticsStats[statIndex]
      const IconComponent = currentStat.icon
      return (
        <AnalyticsContainer style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: "500px" }}>
            <div style={{ marginBottom: "0.75rem", color: "#64748b", fontSize: "0.875rem" }}>
              {statIndex + 1} of {analyticsStats.length}
            </div>
            <div
              key={statIndex}
              style={{
                animation: "fadeIn 0.8s ease",
                padding: "3rem",
                background: "rgba(30, 41, 59, 0.6)",
                borderRadius: "1.5rem",
                border: `2px solid ${currentStat.color}40`,
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "1rem",
                  background: `${currentStat.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem auto",
                }}
              >
                <IconComponent size={40} style={{ color: currentStat.color }} />
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                {currentStat.title}
              </div>
              <div style={{ fontSize: "4rem", fontWeight: "700", color: "#e2e8f0", marginBottom: "1rem" }}>
                {currentStat.value}
              </div>
              <p style={{ color: "#94a3b8", fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "1rem" }}>
                {currentStat.description}
              </p>
              <p style={{ color: "#475569", fontSize: "0.75rem", fontStyle: "italic" }}>
                Source: {currentStat.source}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1.5rem" }}>
              {analyticsStats.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: i === statIndex ? "#8b5cf6" : "#334155",
                    transition: "all 0.3s",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem" }}>
              {statIndex > 0 && (
                <button
                  onClick={() => setStatIndex((prev) => prev - 1)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "rgba(51, 65, 85, 0.5)",
                    border: "1px solid rgba(71, 85, 105, 0.5)",
                    borderRadius: "0.5rem",
                    color: "#94a3b8",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Previous
                </button>
              )}
              <button
                onClick={() => {
                  if (statIndex < analyticsStats.length - 1) {
                    setStatIndex((prev) => prev + 1)
                  } else {
                    setAnalyticsStep(2)
                  }
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#8b5cf6",
                  border: "none",
                  borderRadius: "0.5rem",
                  color: "white",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                {statIndex < analyticsStats.length - 1 ? "Next" : "Continue"}
              </button>
            </div>
            <button
              onClick={() => setAnalyticsStep(2)}
              style={{
                marginTop: "1rem",
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Skip to Your Results
            </button>
          </div>
        </AnalyticsContainer>
      )
    }

    if (analyticsStep === 2) {
      return (
        <AnalyticsContainer style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: "700px", animation: "fadeIn 1s ease" }}>
            <SectionTitle style={{ marginBottom: "2rem" }}>Your Choices in Context</SectionTitle>

            <ComparisonSection>
              <ComparisonCard style={{ textAlign: "left" }}>
                <ComparisonTitle>{simulationAnalyticsDefaults.comparison.title}</ComparisonTitle>

                <ComparisonBar>
                  <ComparisonLabel>
                    <span>Final Money: ${stats.money}</span>
                    <span>{simulationAnalyticsDefaults.comparison.benchmarks.money}</span>
                  </ComparisonLabel>
                  <ComparisonTrack>
                    <ComparisonFill $width={Math.min(100, (stats.money / moneyComparisonMax) * 100)} $color="#4ade80" />
                  </ComparisonTrack>
                </ComparisonBar>

                <ComparisonBar>
                  <ComparisonLabel>
                    <span>Health Level: {stats.health}%</span>
                    <span>{simulationAnalyticsDefaults.comparison.benchmarks.health}</span>
                  </ComparisonLabel>
                  <ComparisonTrack>
                    <ComparisonFill $width={stats.health} $color="#f87171" />
                  </ComparisonTrack>
                </ComparisonBar>

                <ComparisonBar>
                  <ComparisonLabel>
                    <span>Support Network: {supportValue}/100</span>
                    <span>{simulationAnalyticsDefaults.comparison.benchmarks.support}</span>
                  </ComparisonLabel>
                  <ComparisonTrack>
                    <ComparisonFill $width={Math.min(100, Math.max(0, supportValue))} $color="#c084fc" />
                  </ComparisonTrack>
                </ComparisonBar>

                <InsightBox>
                  <InsightText>
                    {supportValue >= 30
                      ? simulationAnalyticsDefaults.comparison.insights.supportHigh
                      : stats.money >= 80
                      ? simulationAnalyticsDefaults.comparison.insights.moneyHigh
                      : simulationAnalyticsDefaults.comparison.insights.fallback}
                  </InsightText>
                </InsightBox>
              </ComparisonCard>
            </ComparisonSection>

            <ContinueButton onClick={() => setAnalyticsStep(3)} style={{ margin: "2rem auto 0 auto" }}>
              {simulationAnalyticsDefaults.comparison.nextLabel}
              <ChevronRight size={18} />
            </ContinueButton>
          </div>
        </AnalyticsContainer>
      )
    }

    if (analyticsStep === 3) {
      return (
        <AnalyticsContainer style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "800px", animation: "fadeIn 1s ease" }}>
            <SectionTitle style={{ marginBottom: "1rem" }}>{simulationAnalyticsDefaults.action.title}</SectionTitle>
            <p style={{ color: "#94a3b8", marginBottom: "2.5rem", fontSize: "1.1rem" }}>
              {simulationAnalyticsDefaults.action.subtitle}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2.5rem", justifyItems: "center" }}>
              {simulationAnalyticsDefaults.action.cards.map((card) => {
                const Icon = analyticsActionIconMap[card.icon]
                const rgb =
                  card.color === "#8b5cf6" ? "139, 92, 246" : card.color === "#60a5fa" ? "96, 165, 250" : "74, 222, 128"
                return (
                  <div
                    key={card.title}
                    style={{
                      background: `rgba(${rgb}, 0.1)`,
                      border: `1px solid rgba(${rgb}, 0.3)`,
                      borderRadius: "1rem",
                      padding: "1.5rem",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      maxWidth: 280,
                    }}
                  >
                    <Icon size={24} style={{ color: card.color, marginBottom: "0.75rem" }} />
                    <h3 style={{ color: "#e2e8f0", fontWeight: "600", marginBottom: "0.5rem" }}>{card.title}</h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: "1.5" }}>{card.body}</p>
                  </div>
                )
              })}
            </div>

            <ResourcesSection>
              <h3 style={{ color: "#e2e8f0", fontWeight: "600", marginBottom: "1rem" }}>
                {simulationAnalyticsDefaults.action.resourcesTitle}
              </h3>
              <ResourcesGrid>
                {(storyRuntimeConfig?.resourceLinks ?? []).map((link) => (
                  <ResourceLink key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </ResourceLink>
                ))}
              </ResourcesGrid>
            </ResourcesSection>

            {storyRuntimeConfig?.methodologyText && (
              <MethodologySection style={{ marginBottom: "2rem", textAlign: "left" }}>
                <h3 style={{ color: "#94a3b8", fontWeight: "600", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
                  {simulationAnalyticsDefaults.action.methodologyTitle}
                </h3>
                <MethodologyText>{storyRuntimeConfig.methodologyText}</MethodologyText>
              </MethodologySection>
            )}

            <ActionButtons>
              <ReplayButton onClick={handleRestart}>
                <RotateCcw size={18} />
                Experience Again
              </ReplayButton>

              <ContinueButton onClick={() => router.push("/scenarios")}>
                Explore More Stories
                <ChevronRight size={18} />
              </ContinueButton>
            </ActionButtons>
          </div>
        </AnalyticsContainer>
      )
    }
  }

  if (isComplete && showReflection && !showAnalytics && canShowReflection) {
    const canViewAnalytics = allReflectionsAnswered && !submittingReflections

    return (
      <Container style={{ height: "auto", minHeight: "100vh", overflow: "auto" }}>
        <CompletionBox>
          <CompletionTitle>Take a Moment to Reflect</CompletionTitle>
          <CompletionText>
            Consider {currentStory.avatarName}&apos;s experiences and the weight of their responsibilities. Your
            reflections help connect the story to real-world context.
          </CompletionText>

          <ReflectionBox>
            <ReflectionTitle>Your Reflections</ReflectionTitle>

            {reflectionQuestions.map((question) => (
              <ReflectionQuestion key={question.id}>
                <QuestionText>{question.prompt}</QuestionText>
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
                <QuestionText>{openReflectionQuestion.prompt}</QuestionText>
                <OpenEndedInput
                  placeholder={openReflectionQuestion.placeholder}
                  value={reflectionAnswers[openReflectionQuestion.id] ?? ""}
                  onChange={(event) => handleReflectionChange(openReflectionQuestion.id, event.target.value)}
                />
              </ReflectionQuestion>
            )}
          </ReflectionBox>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <ReplayButton onClick={handleRestart}>
              <RotateCcw size={18} />
              Try Again
            </ReplayButton>

            <ContinueButton
              onClick={handleViewAnalytics}
              disabled={!canViewAnalytics}
              style={{ background: canViewAnalytics ? "#8b5cf6" : "#475569" }}
            >
              <BarChart3 size={18} />
              View Real-World Data
            </ContinueButton>
          </div>

          {!allReflectionsAnswered && (
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "1rem" }}>
              Please answer all reflection questions to continue ({requiredAnsweredCount} of {requiredTotalCount})
            </p>
          )}
        </CompletionBox>
      </Container>
    )
  }
  
  const textContent = Array.isArray(currentPassage.text) ? currentPassage.text : [currentPassage.text]
  const passageImage = currentPassage.image || ""

  // Support both local paths and Cloudinary URLs for background images
  const hasBackgroundImage = !!passageImage && (
    passageImage.startsWith("/scenes/") ||
    passageImage.includes("cloudinary.com") ||
    passageImage.includes("res.cloudinary.com")
  )
  const shouldPrioritizeBackground = historyStack.length === 0

  return (
    <Container>
      {/* Background Layer: Full screen, prominent */}
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
              style={{ objectFit: "cover" }}
            />
          </BackgroundImageLayer>
        )}
        <GradientOverlay />
      </BackgroundLayer>

      {/* Top Bar: Minimal stats */}
      <TopBar>
        <BackButton onClick={() => router.push("/")}>
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

        {/* Choices */}
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
