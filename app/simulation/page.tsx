"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import styled, { keyframes, css } from "styled-components";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, Volume2, VolumeX, Play, Pause, Heart, Brain, Eye } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Avatar, AvatarAppearance, Resources, SocialContext } from "@/types/simulation";

const Page = styled.div`
  min-height: 100vh;
  color: #e2e8f0;
  background: radial-gradient(80rem 40rem at 20% -10%, rgba(99,102,241,.18), transparent),
              radial-gradient(70rem 40rem at 110% 10%, rgba(168,85,247,.14), transparent),
              #0f172a;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  border-bottom: 1px solid rgba(30, 41, 59, 0.9);
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 10;
`;

const HeaderInner = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const GhostBtn = styled(Button)`
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(148,163,184,.18);
  padding: .4rem .65rem;
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  &:hover { background: rgba(30,41,59,.7); color: #fff; }
`;

const Title = styled.h1`
  font-size: 1.1rem;
  font-weight: 700;
  color: #e2e8f0;
`;

const MetricTray = styled.div`
  display: inline-flex;
  align-items: center;
  gap: .75rem;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.6);
  padding: .4rem .6rem;
  border-radius: .6rem;
  font-size: .75rem;
`;

const Dot = styled.div<{ active?: boolean; color?: string }>`
  width: .6rem; height: .6rem; border-radius: 999px;
  background: ${({ color }) => color || "#22d3ee"};
  ${({ active }) => active && css`animation: pulse 1.2s infinite;`}
  @keyframes pulse {
    0% { transform: scale(1); opacity: .85; }
    50% { transform: scale(1.25); opacity: .5; }
    100% { transform: scale(1); opacity: .85; }
  }
`;

const Divider = styled.div`
  width: 1px; height: 1rem; background: rgba(71, 85, 105, 0.9);
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  position: relative;
  z-index: 10;
`;

const Shell = styled.div`
  width: 100%;
  max-width: 64rem;
`;

const IntroWrap = styled.div`
  margin-bottom: 3rem;
  text-align: center;
`;

const H2 = styled.h2`
  font-size: clamp(1.6rem, 3vw, 2rem);
  font-weight: 800;
  margin-bottom: 1rem;
  color: #e5e7eb;
`;

const Lead = styled.p`
  color: #cbd5e1;
  font-size: 1.05rem;
  line-height: 1.8;
  max-width: 42rem;
  margin: 0 auto 1rem;
`;

const Notice = styled.div`
  margin: 2rem auto 0;
  max-width: 42rem;
  padding: 1rem;
  border: 1px solid rgba(51, 65, 85, 0.7);
  background: rgba(30, 41, 59, 0.5);
  border-radius: .75rem;
  color: #94a3b8;
  font-size: .9rem;
`;

const GlassCard = styled(Card)`
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.7);
  backdrop-filter: blur(4px);
  position: relative;
`;

const CC = styled(CardContent)`
  padding: 2rem;
  position: relative;
`;

const EmotionGlow = styled.div<{ emotion: string; intensity: number }>`
  position: absolute; inset: 0; border-radius: .75rem; pointer-events: none;
  transition: box-shadow .8s ease, opacity .8s ease;
  opacity: ${({ intensity }) => Math.max(0, Math.min(1, intensity))};
  ${({ emotion }) => {
    const m: Record<string, string> = {
      fear: "rgba(239, 68, 68, .25)",
      hope: "rgba(59, 130, 246, .25)",
      sadness: "rgba(99, 102, 241, .25)",
      anger: "rgba(249, 115, 22, .25)",
      peace: "rgba(34, 197, 94, .25)",
      anxiety: "rgba(234, 179, 8, .25)",
      neutral: "rgba(100, 116, 139, .15)",
    };
    const c = m[emotion] ?? m.neutral;
    return css`box-shadow: 0 0 0 2px ${c} inset, 0 18px 40px ${c};`;
  }}
`;

const ContextBox = styled.div`
  padding: .75rem;
  background: rgba(2, 6, 23, 0.35);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: .6rem;
  margin-bottom: 1.25rem;
  color: #94a3b8;
`;

const Label = styled.p`
  color: #7c8da0;
  font-weight: 600;
  letter-spacing: .08em;
  font-size: .7rem;
  text-transform: uppercase;
  margin: 0 0 .25rem;
`;

const ContextMeta = styled.div`
  display: flex; align-items: center; gap: 1rem; margin-top: .35rem;
  color: #94a3b8; font-size: .78rem;
  span b { color: #cbd5e1; font-weight: 600; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Paragraph = styled.p<{ delay?: number }>`
  color: #e2e8f0;
  font-size: 1.05rem;
  line-height: 1.8;
  font-weight: 300;
  animation: ${fadeIn} .6s ease-out forwards;
  opacity: 0;
  ${({ delay }) => delay ? css`animation-delay: ${delay}ms;` : ""};
`;

const SectionHeader = styled.div`
  display: flex; align-items: center; gap: .75rem; margin: .75rem 0 1rem;
`;

const Line = styled.div`
  height: 1px; flex: 1;
  background: linear-gradient(90deg, rgba(236,72,153,.5), transparent);
`;

const SmallLine = styled.div`
  width: 2rem; height: 1px; background: #ec4899;
`;

const H3 = styled.h3`
  font-weight: 700; color: #e5e7eb; margin: 0; font-size: 1.05rem;
`;

const ChoiceBtn = styled(Button)`
  border: 1px solid rgba(71, 85, 105, 0.8);
  background: rgba(51, 65, 85, 0.35);
  color: #e2e8f0;
  padding: 1rem 1.1rem; height: auto; text-align: left; justify-content: flex-start;
  transition: transform .12s ease, background .2s ease, border-color .2s ease;
  &:hover { transform: translateY(-1px); background: rgba(71, 85, 105, 0.45); border-color: rgba(236,72,153,.5); }
`;

const ChoiceInner = styled.div`
  display: flex; align-items: flex-start; gap: .75rem;
`;

const Bubble = styled.div`
  width: 1.5rem; height: 1.5rem; border-radius: 999px;
  background: rgba(71,85,105,.7); display: grid; place-items: center;
  font-size: .75rem; color: #cbd5e1; font-weight: 600; margin-top: .15rem;
`;

const CtaBar = styled.div`
  text-align: center; padding: 1rem 0 0;
`;

const PrimaryCta = styled(Button)`
  background: linear-gradient(90deg, #db2777, #7c3aed);
  color: #fff; border: 1px solid rgba(124,58,237,.4);
  &:hover { filter: brightness(1.08); }
`;

const DoneWrap = styled.div`
  text-align: center; padding: 2rem 0;
  color: #cbd5e1; font-size: .95rem;
`;

const DoneLine = styled.div`
  width: 4rem; height: 1px;
  margin: 0 auto 1rem;
  background: linear-gradient(90deg, transparent, #ec4899, transparent);
`;

const DoneBtns = styled.div`
  display: inline-flex; gap: .75rem; margin-top: .75rem;
`;

const LiteBtn = styled(Button)`
  background: #334155; color: #e5e7eb;
  &:hover { background: #475569; }
`;

const Overlay3D = styled.div`
  position: absolute; inset: 0; pointer-events: none;
`;

const Tint = styled.div<{ emotion: string; intensity: number }>`
  position: absolute; inset: 0;
  transition: opacity 1.2s ease;
  opacity: ${({ intensity }) => Math.max(0, Math.min(1, intensity))};
  ${({ emotion }) => {
    const bg: Record<string, string> = {
      fear: "rgba(127, 29, 29, .18)",
      hope: "rgba(30, 58, 138, .18)",
      sadness: "rgba(30, 27, 75, .22)",
      anger: "rgba(124, 45, 18, .18)",
      peace: "rgba(20, 83, 45, .18)",
      anxiety: "rgba(113, 63, 18, .18)",
      neutral: "rgba(15, 23, 42, .08)",
    };
    const c = bg[emotion] ?? bg.neutral;
    return css`background: ${c};`;
  }}
`;

const Center = styled.div`
  min-height: 100vh; display: grid; place-items: center; background: #0f172a;
  color: #94a3b8; text-align: center;
`;

const BlinkDot = styled.div`
  width: .65rem; height: .65rem; border-radius: 999px; background: #ec4899;
  animation: blink 1.2s infinite;
  margin: 0 auto .8rem;
  @keyframes blink { 0%, 100% { opacity: .3 } 50% { opacity: 1 } }
`;

const HiddenAudio = styled.audio`
  display: none;
`;

function BackgroundAudioManager({ emotion, intensity }: { emotion: string; intensity: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.1 + intensity * 0.15;
    const emotionRates: Record<string, number> = {
      fear: 1.1, anxiety: 1.05, anger: 1.15, sadness: 0.85, hope: 1.0, peace: 0.9, neutral: 1.0,
    };
    audioRef.current.playbackRate = emotionRates[emotion] ?? 1.0;
  }, [emotion, intensity]);

  return (
    <HiddenAudio ref={audioRef} loop autoPlay>
      {/* placeholder audio path; swap to a real .mp3 AFTER */}
      <source src="/ambient-atmospheric-background.mp3" type="audio/mpeg" />
    </HiddenAudio>
  );
}

function EmotionalParticles({ emotion }: { emotion: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 80;

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const emotionData = {
      fear: { color: [1, 0.1, 0.1], movement: "erratic", size: 0.8 },
      hope: { color: [0.2, 0.7, 1], movement: "upward", size: 1.2 },
      sadness: { color: [0.3, 0.3, 0.9], movement: "downward", size: 0.6 },
      anger: { color: [1, 0.3, 0], movement: "aggressive", size: 1.4 },
      peace: { color: [0.2, 1, 0.4], movement: "gentle", size: 1.0 },
      anxiety: { color: [1, 1, 0.1], movement: "jittery", size: 0.9 },
      neutral: { color: [0.7, 0.7, 0.7], movement: "calm", size: 1.0 },
    } as const;

    const data = (emotionData as any)[emotion] ?? emotionData.neutral;
    const [r, g, b] = data.color;

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;

      colors[i * 3 + 0] = r + Math.random() * 0.3 - 0.15;
      colors[i * 3 + 1] = g + Math.random() * 0.3 - 0.15;
      colors[i * 3 + 2] = b + Math.random() * 0.3 - 0.15;

      sizes[i] = data.size * (0.7 + Math.random() * 0.6);
    }
    return { positions, colors, sizes };
  }, [emotion, count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const m = new THREE.Matrix4();
      let x = positions[i * 3 + 0];
      let y = positions[i * 3 + 1];
      let z = positions[i * 3 + 2];

      switch (emotion) {
        case "fear":     x += Math.sin(time * 3 + i) * 3; y += Math.cos(time * 2.5 + i) * 2; break;
        case "anxiety":  x += Math.sin(time * 4 + i) * 1.5; y += Math.sin(time * 3.5 + i) * 1.5; break;
        case "anger":    x += Math.sin(time * 2 + i) * 4;  z += Math.cos(time * 1.8 + i) * 3;  break;
        case "sadness":  y += Math.sin(time * 0.5 + i) * 0.5 - 0.5; break;
        case "hope":     y += Math.sin(time * 0.8 + i) * 1 + 0.5;  break;
        default:         x += Math.sin(time * 0.5 + i) * 2; y += Math.sin(time * 0.3 + i) * 1;
      }

      const s = sizes[i] * (0.8 + Math.sin(time * 2 + i) * 0.4);
      m.setPosition(x, y, z);
      m.multiply(new THREE.Matrix4().makeScale(s, s, s));
      meshRef.current.setMatrixAt(i, m);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.06]} />
      <meshBasicMaterial transparent opacity={0.7} />
    </instancedMesh>
  );
}

function RainDrops() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000;

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 25 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      velocities[i] = Math.random() * 2 + 8;
    }
    return { positions, velocities };
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const m = new THREE.Matrix4();
      const x = positions[i * 3 + 0] + Math.sin(time * 0.5 + i) * 0.5;
      let y = positions[i * 3 + 1] - ((time * velocities[i]) % 30);
      const z = positions[i * 3 + 2];

      if (y < -5) y = 25 + Math.random() * 5;
      m.setPosition(x, y, z);
      m.multiply(new THREE.Matrix4().makeRotationZ(Math.sin(time + i) * 0.1));
      meshRef.current.setMatrixAt(i, m);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <cylinderGeometry args={[0.008, 0.015, 0.4]} />
      <meshBasicMaterial color="#6bb6ff" transparent opacity={0.7} />
    </instancedMesh>
  );
}

function Rain3D() {
  return (
    <Overlay3D>
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={0.3} color="#4a90e2" />
        <Suspense fallback={null}>
          <RainDrops />
        </Suspense>
      </Canvas>
    </Overlay3D>
  );
}

function EmotionalAtmosphere({ emotion, intensity }: { emotion: string; intensity: number }) {
  return (
    <Overlay3D>
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <ambientLight intensity={0.1} />
        <directionalLight position={[10, 10, 5]} intensity={0.2} />
        <Suspense fallback={null}>
          <EmotionalParticles emotion={emotion} />
        </Suspense>
      </Canvas>
      <Tint emotion={emotion} intensity={intensity} />
    </Overlay3D>
  );
}

interface StoryPassage {
  id: string;
  duration: string;
  visual: string;
  audio: string;
  text: string[];
  emotion?: string;
  intensity?: number;
  choices?: { id: string; text: string; leads_to: string }[];
  next?: string;
}

type StoryNodeContentPayload = {
  duration?: string | null;
  text?: unknown;
  choices?: { id: string; text?: string; leads_to?: string }[] | null;
  next?: string | null;
  emotion?: string | null;
  intensity?: number | null;
}

type StoryNodePayload = {
  id: string;
  key: string;
  content?: StoryNodeContentPayload | null;
  media?: { visual?: string | null; audio?: string | null } | null;
}

type StoryTransitionPayload = {
  fromNodeId: string;
  toNodeId?: string | null;
  pathId: string;
  ordering?: number | null;
}

const defaultAppearance: AvatarAppearance = {
  skinTone: "",
  hairColor: "",
  hairStyle: "",
  clothing: "",
  accessories: [],
};

const defaultResources: Resources = {
  money: 0,
  time: 0,
  energy: 0,
  socialSupport: 0,
  mentalHealth: 0,
  physicalHealth: 0,
};

const defaultSocialContext: SocialContext = {
  socioeconomicStatus: "middle",
  location: "",
  familyStructure: "",
  educationLevel: "",
  employmentStatus: "",
  healthConditions: [],
  socialIssues: [],
};

function normalizeAvatar(raw: any, storySlug: string | null): Avatar {
  const appearance: AvatarAppearance = {
    ...defaultAppearance,
    ...(raw?.appearance ?? {}),
    accessories: Array.isArray(raw?.appearance?.accessories)
      ? (raw.appearance.accessories as string[])
      : defaultAppearance.accessories,
  };

  const initialResources: Resources = { ...defaultResources };
  (Object.keys(defaultResources) as (keyof Resources)[]).forEach((key) => {
    const value = raw?.initialResources?.[key];
    initialResources[key] = typeof value === "number" ? value : defaultResources[key];
  });

  const rawContext = raw?.socialContext ?? {};
  const socialContext: SocialContext = {
    ...defaultSocialContext,
    ...rawContext,
    socioeconomicStatus: ["low", "middle", "high"].includes(rawContext?.socioeconomicStatus)
      ? rawContext.socioeconomicStatus
      : defaultSocialContext.socioeconomicStatus,
    healthConditions: Array.isArray(rawContext?.healthConditions)
      ? (rawContext.healthConditions as string[])
      : [],
    socialIssues: Array.isArray(rawContext?.socialIssues)
      ? (rawContext.socialIssues as any[]).map((issue) => ({
          id: issue?.id ?? "",
          type: issue?.type ?? "racism",
          severity: issue?.severity ?? "moderate",
          description: issue?.description ?? "",
          impacts: Array.isArray(issue?.impacts) ? issue.impacts : [],
        }))
      : [],
  } as SocialContext;

  return {
    id: raw.id,
    name: raw.name ?? "",
    age: typeof raw.age === "number" ? raw.age : 0,
    background: raw.background ?? "",
    appearance,
    initialResources,
    socialContext,
    isPlayable: !!raw.isPlayable,
    storySlug,
  };
}

function buildPersonaStory(
  avatarId: string,
  story: { title?: string | null; summary?: string | null } | null,
  nodes: StoryNodePayload[],
  transitions: StoryTransitionPayload[],
): { avatarId: string; title: string; theme: string; passages: Record<string, StoryPassage> } {
  const passages: Record<string, StoryPassage> = {};
  const nodeById = new Map<string, StoryNodePayload>();
  const keyById = new Map<string, string>();

  nodes.forEach((node) => {
    nodeById.set(node.id, node);
    keyById.set(node.id, node.key);
  });

  const transitionsByFrom = new Map<string, StoryTransitionPayload[]>();
  transitions.forEach((transition) => {
    const list = transitionsByFrom.get(transition.fromNodeId) ?? [];
    list.push(transition);
    transitionsByFrom.set(transition.fromNodeId, list);
  });

  nodes.forEach((node) => {
    const content = node.content ?? {};
    const media = node.media ?? {};
    const passage: StoryPassage = {
      id: node.key,
      duration: (content.duration as string) ?? "",
      visual: (media.visual as string) ?? "",
      audio: (media.audio as string) ?? "",
      text: Array.isArray(content.text) ? (content.text as string[]) : [],
      emotion: (content.emotion as string) ?? undefined,
      intensity: typeof content.intensity === "number" ? content.intensity : undefined,
    };

    if (Array.isArray(content.choices) && content.choices.length) {
      passage.choices = content.choices.map((choice) => ({
        id: choice.id,
        text: choice.text ?? "",
        leads_to: choice.leads_to ?? "",
      }));
    } else {
      const outgoing = transitionsByFrom.get(node.id) ?? [];
      const first = outgoing[0];
      if (!passage.next && first?.toNodeId) {
        const key = keyById.get(first.toNodeId);
        if (key) passage.next = key;
      }
    }

    if (!passage.next && typeof content.next === "string") {
      passage.next = content.next;
    }

    passages[node.key] = passage;
  });

  return {
    avatarId,
    title: story?.title ?? "",
    theme: story?.summary ?? "",
    passages,
  };
}

export default function SimulationPage() {
  const router = useRouter();

  const [currentPassage, setCurrentPassage] = useState<string>("start");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [currentStory, setCurrentStory] = useState<any>(null);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [emotionalIntensity, setEmotionalIntensity] = useState<number>(0.3);
  const [hasReportedCompletion, setHasReportedCompletion] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatarStory() {
      const avatarId = localStorage.getItem("selectedAvatarId");
      if (!avatarId) {
        router.push("/avatar");
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`/api/avatars/${avatarId}`, { cache: "no-store" });
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : null;

        if (!response.ok) {
          throw new Error((data && data.error) || raw || "Unable to load story.");
        }

        if (cancelled) return;

        const normalizedAvatar = normalizeAvatar(data.avatar, data?.story?.slug ?? null);
        if (!data.story) {
          throw new Error("Story not available yet.");
        }

        const transformedStory = buildPersonaStory(
          normalizedAvatar.id,
          data.story,
          (data.nodes ?? []) as StoryNodePayload[],
          (data.transitions ?? []) as StoryTransitionPayload[],
        );

        if (!Object.keys(transformedStory.passages).length) {
          throw new Error("Story data is incomplete.");
        }

        setSelectedAvatar(normalizedAvatar);
        setCurrentStory(transformedStory);
        const initialKey = transformedStory.passages["start"]
          ? "start"
          : Object.keys(transformedStory.passages)[0];
        setCurrentPassage(initialKey);
        setHasReportedCompletion(false);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          router.push("/avatar");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAvatarStory();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const passage: StoryPassage | undefined = currentStory?.passages[currentPassage];

  useEffect(() => {
    if (!passage) return;
    setCurrentEmotion(passage.emotion ?? "neutral");
    setEmotionalIntensity(typeof passage.intensity === "number" ? passage.intensity : 0.3);
  }, [passage]);

  useEffect(() => {
    if (!selectedAvatar || !currentStory || !passage) return;
    const isTerminal = (!passage.next || passage.next.length === 0) && (!passage.choices || passage.choices.length === 0);
    if (!isTerminal || hasReportedCompletion) return;

    const controller = new AbortController();
    const issue = selectedAvatar.socialContext.socialIssues[0];
    const estimatedMinutes = Math.max(10, Object.keys(currentStory.passages ?? {}).length * 3);

    fetch("/api/journeys/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: selectedAvatar.id,
        scenario: {
          title: currentStory.title,
          description: currentStory.theme,
          issue,
          difficulty: issue?.severity,
          estimatedMinutes,
          minimumResources: selectedAvatar.initialResources,
        },
      }),
      signal: controller.signal,
    })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Failed to sync scenario completion", err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setHasReportedCompletion(true);
        }
      });

    return () => controller.abort();
  }, [selectedAvatar, currentStory, passage, hasReportedCompletion]);

  useEffect(() => {
    // passage audio lifecycle
    const audioElement = audioRef.current;
    if (!audioElement) return () => {};

    let timer: ReturnType<typeof setTimeout> | null = null;

    if (passage?.audio) {
      audioElement.pause();
      setIsAudioPlaying(false);

      timer = setTimeout(() => {
        audioElement.src = `/placeholder.svg?height=1&width=1&query=ambient-${passage.id}`;
        audioElement.volume = 0.3;
        audioElement.muted = isMuted;
        audioElement.load();
      }, 100);
    } else {
      audioElement.pause();
      setIsAudioPlaying(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      audioElement.pause();
      setIsAudioPlaying(false);
    };
  }, [passage, isMuted]);

  const toggleAudio = async () => {
    if (!audioRef.current) return;
    try {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        if (audioRef.current.readyState >= 2) {
          await audioRef.current.play();
          setIsAudioPlaying(true);
        }
      }
    } catch {
      setIsAudioPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleChoice = (choiceId: string) => {
    const choice = passage?.choices?.find((c: any) => c.id === choiceId);
    if (!choice) return;
    setIsLoading(true);
    setEmotionalIntensity(0.8);
    audioRef.current?.pause();
    setIsAudioPlaying(false);

    setTimeout(() => {
      setCurrentPassage(choice.leads_to);
      setIsLoading(false);
      setEmotionalIntensity(0.3);
    }, 1000);
  };

  const handleContinue = () => {
    if (!passage?.next) return;
    setIsLoading(true);
    audioRef.current?.pause();
    setIsAudioPlaying(false);
    setTimeout(() => {
      setCurrentPassage(passage.next!);
      setIsLoading(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <Center>
        <div>
          <BlinkDot />
          <div>Loading...</div>
        </div>
      </Center>
    );
  }

  if (!currentStory || !selectedAvatar) {
    return (
      <Center>
        <div>
          <BlinkDot />
          <div>Preparing your story...</div>
        </div>
      </Center>
    );
  }

  return (
    <Page>
      <BackgroundAudioManager emotion={currentEmotion} intensity={emotionalIntensity} />
      {passage && <EmotionalAtmosphere emotion={currentEmotion} intensity={emotionalIntensity} />}

      <Header>
        <HeaderInner>
          <Row>
            <GhostBtn size="sm" onClick={() => router.push("/avatar")}>
              <ArrowLeft size={16} /> Back
            </GhostBtn>
            <Title>
              {selectedAvatar.name}: {currentStory.title}
            </Title>
          </Row>

          <Row>
            <span style={{ color: "#64748b", fontSize: ".75rem", marginLeft: ".5rem" }}>Audio:</span>
            <GhostBtn size="sm" onClick={toggleAudio} style={{ width: 32, height: 32, padding: 0 }}>
              {isAudioPlaying ? <Pause size={12} /> : <Play size={12} />}
            </GhostBtn>
            <GhostBtn size="sm" onClick={toggleMute} style={{ width: 32, height: 32, padding: 0 }}>
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </GhostBtn>
            <GhostBtn size="sm" onClick={() => router.push("/")}>
              <Home size={16} /> Home
            </GhostBtn>
          </Row>
        </HeaderInner>
      </Header>

      {/* passage audio (IN PROGRESS AND HIDDEN) */}
      {passage?.audio && (
        <HiddenAudio
          ref={audioRef}
          loop
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onError={() => setIsAudioPlaying(false)}
          onLoadStart={() => setIsAudioPlaying(false)}
        >
          <source src={`/placeholder.svg?height=1&width=1&query=ambient-${passage.id}`} type="audio/mpeg" />
          Your browser does not support the audio element.
        </HiddenAudio>
      )}

      <Body>
        <Shell>
          {currentPassage === "start" && (
            <IntroWrap>
              <H2>
                {selectedAvatar.name}&apos;s Journey: {currentStory.title}
              </H2>
              <Lead>
                Step into the shoes of {selectedAvatar.name}, experiencing their world through immersive storytelling.
                Every choice you make shapes their journey and reveals the complexities of their reality.
              </Lead>
              <Notice>
                This interactive experience includes audio, visual cues, and mature themes. Headphones recommended for
                the best experience.
              </Notice>
            </IntroWrap>
          )}

          <GlassCard>
            <EmotionGlow emotion={currentEmotion} intensity={emotionalIntensity} />
            <CC>
              {currentPassage === "crash" && (
                <div style={{
                  position: "relative",
                  height: "16rem",
                  borderRadius: ".6rem",
                  overflow: "hidden",
                  border: "1px solid rgba(51,65,85,.6)",
                  background: "#0b1220",
                  marginBottom: "1.25rem"
                }}>
                  <Rain3D />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to bottom, rgba(30,41,59,.3), rgba(2,6,23,.8))",
                    display: "grid", placeItems: "center"
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <Dot color="#ef4444" active />
                      <div style={{ color: "#cbd5e1", fontSize: ".85rem", fontWeight: 600 }}>Impact Scene</div>
                    </div>
                  </div>
                </div>
              )}

              <ContextBox>
                <Label>Audio & Emotional Context</Label>
                <div style={{ color: "#9aa7b7", fontSize: ".9rem" }}>{passage?.audio}</div>
                <ContextMeta>
                  <span>Emotion: <b style={{ textTransform: "capitalize" }}>{currentEmotion}</b></span>
                  <span>Intensity: <b>{Math.round(emotionalIntensity * 100)}%</b></span>
                  <span>Audio: <b>{isAudioPlaying ? "On" : "Off"}</b></span>
                </ContextMeta>
              </ContextBox>

              <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
                {(passage?.text ?? []).map((t, i) => (
                  <Paragraph key={i} delay={i * 300}>{t}</Paragraph>
                ))}
              </div>

              {passage?.choices ? (
                <>
                  <SectionHeader>
                    <SmallLine />
                    <H3>What do you choose?</H3>
                    <Line />
                  </SectionHeader>
                  <div style={{ display: "grid", gap: ".75rem" }}>
                    {passage.choices.map((c, i) => (
                      <ChoiceBtn key={c.id} variant="outline" onClick={() => handleChoice(c.id)}>
                        <ChoiceInner>
                          <Bubble>{i + 1}</Bubble>
                          <span>{c.text}</span>
                        </ChoiceInner>
                      </ChoiceBtn>
                    ))}
                  </div>
                </>
              ) : passage?.next ? (
                <CtaBar>
                  <PrimaryCta onClick={handleContinue}>Continue Journey</PrimaryCta>
                </CtaBar>
              ) : (
                <DoneWrap>
                  <DoneLine />
                  <div style={{ fontSize: "1.05rem", color: "#e2e8f0", marginBottom: ".25rem" }}>Journey Complete</div>
                  <div>Thank you for experiencing {selectedAvatar.name}&apos;s story.</div>
                  <DoneBtns>
                    <LiteBtn onClick={() => router.push("/avatar")}>Explore Another Story</LiteBtn>
                    <LiteBtn onClick={() => router.push("/")}>Return Home</LiteBtn>
                  </DoneBtns>
                </DoneWrap>
              )}
            </CC>
          </GlassCard>
        </Shell>
      </Body>
    </Page>
  );
}
