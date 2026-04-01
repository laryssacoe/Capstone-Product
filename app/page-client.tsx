"use client";

import type React from "react";
import styled from "styled-components";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import * as THREE from "three";
import emailjs from '@emailjs/browser';

import { Button as UIButton } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { TutorialPrompt } from "@/components/tutorial-prompt";
import { ProfileBubbleChip } from "@/components/profile-bubble-chip";
import { loop_logo_url } from "@/lib/brand-assets";
import { HomePageConfig, buildHomeStoryHref, type HomeGlobePin } from "@/lib/config/home-page";

import { Globe, Heart, Brain, ChevronDown, Mail, X } from "lucide-react";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Html, Sphere } from "@react-three/drei";

const homeQuickstartKey = HomePageConfig.storage.quickStartDismissedKey;
const homeQuickstartHiddenSessionKey = HomePageConfig.storage.quickStartHiddenSessionKey;

/* Globe config */
const radius: number = HomePageConfig.globe.radius;
const TopoLink = HomePageConfig.globe.topoUrl;
const globe_examples: HomeGlobePin[] = [...HomePageConfig.globe.pins];
const globeVisualRadius = radius + 0.12;
const globeViewportPadding = 1.06;

function latLngToXYZ(lat: number, lng: number, r: number = radius): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

function decodeArcs(topo: any): number[][][][] {
  const { arcs: rawArcs, transform } = topo;
  const scale = transform?.scale || [1, 1];
  const translate = transform?.translate || [0, 0];

  const decoded: number[][][] = rawArcs.map((arc: number[][]) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]: number[]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });

  function resolve(indices: number[]): number[][] {
    const pts: number[][] = [];
    for (const idx of indices) {
      const arc = idx >= 0 ? decoded[idx] : [...decoded[~idx]].reverse();
      pts.push(...(pts.length ? arc.slice(1) : arc));
    }
    return pts;
  }

  const geomKey = Object.keys(topo.objects)[0];
  const coll = topo.objects[geomKey];
  const geometries = coll.geometries || [coll];
  const polys: number[][][][] = [];

  for (const geom of geometries) {
    if (geom.type === "Polygon") {
      polys.push(geom.arcs.map((ring: number[]) => resolve(ring)));
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.arcs) polys.push(poly.map((ring: number[]) => resolve(ring)));
    }
  }
  return polys;
}

/* Earth coastline lines */
function EarthLines() {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let active = true;
    fetch(TopoLink)
      .then((r) => r.json())
      .then((topo) => {
        if (!active) return;
        const polys = decodeArcs(topo);
        const pts: number[] = [];
        const globe = radius + 0.005;
        for (const poly of polys) {
          for (const ring of poly) {
            for (let i = 0; i < ring.length - 1; i++) {
              const a = latLngToXYZ(ring[i][1], ring[i][0], globe);
              const b = latLngToXYZ(ring[i + 1][1], ring[i + 1][0], globe);
              pts.push(...a, ...b);
            }
          }
        }
        const buf = new THREE.BufferGeometry();
        buf.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        setGeo(buf);
      })
      .catch((e) => console.warn("Globe lines failed:", e));
    return () => { active = false; };
  }, []);

  if (!geo) return null;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#a78bfa" transparent opacity={0.35} />
    </lineSegments>
  );
}

/* Cinematic zoom-in on first load */
function CinematicCamera() {
  const [done, setDone] = useState(false);
  const target = useMemo(() => new THREE.Vector3(0, 0, 5), []);

  useFrame((state) => {
    if (done) return;
    state.camera.position.lerp(target, 0.035);
    if (state.camera.position.distanceTo(target) < 0.05) {
      state.camera.position.copy(target);
      setDone(true);
    }
  });
  return null;
}

function GlobeOrbitControls() {
  const { camera, size } = useThree();

  const safeMinDistance = useMemo(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      return HomePageConfig.globe.orbit.minDistance;
    }

    const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1;
    const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
    const limitingHalfFov = Math.max(0.01, Math.min(verticalHalfFov, horizontalHalfFov));

    // Keep the globe slightly inside the frame so the outer edge never gets clipped.
    const fitDistance = (globeVisualRadius / Math.sin(limitingHalfFov)) * globeViewportPadding;
    return Math.max(HomePageConfig.globe.orbit.minDistance, fitDistance);
  }, [camera, size.height, size.width]);

  return (
    <OrbitControls
      enableZoom
      enablePan={false}
      enableRotate
      minDistance={safeMinDistance}
      maxDistance={HomePageConfig.globe.orbit.maxDistance}
      autoRotate={HomePageConfig.globe.orbit.autoRotate}
      autoRotateSpeed={HomePageConfig.globe.orbit.autoRotateSpeed}
      enableDamping
      dampingFactor={HomePageConfig.globe.orbit.dampingFactor}
      rotateSpeed={HomePageConfig.globe.orbit.rotateSpeed}
      zoomSpeed={HomePageConfig.globe.orbit.zoomSpeed}
    />
  );
}

/* Interactive globe with pins + labels */
function InteractiveGlobe({
  onPinClick,
}: {
  onPinClick: (slug: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef}>
      <Sphere args={[radius, 128, 128]}>
        <meshPhysicalMaterial
          color="#12122a"
          roughness={0.5}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.12}
          transparent
          opacity={0.92}
          emissive="#2e1065"
          emissiveIntensity={0.12}
        />
      </Sphere>

      <Sphere args={[radius + 0.002, 36, 18]}>
        <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.04} />
      </Sphere>

      <EarthLines />

      <Sphere args={[radius + 0.12, 64, 64]}>
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.06} side={THREE.BackSide} />
      </Sphere>

      {globe_examples.map((pin) => {
        const pos = latLngToXYZ(pin.lat, pin.lng, radius + 0.06);
        const labelPos = latLngToXYZ(pin.lat, pin.lng, radius + 0.25);
        return (
          <group key={pin.slug}>
            <mesh position={pos}>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshStandardMaterial color={pin.color} emissive={pin.color} emissiveIntensity={1} />
            </mesh>
            <mesh position={pos} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.07, 0.1, 24]} />
              <meshBasicMaterial color={pin.color} transparent opacity={0.35} side={THREE.DoubleSide} />
            </mesh>
            <InteractiveHtml position={labelPos}>
              <PinLabel $color={pin.color} onClick={() => onPinClick(pin.slug)}>
                {pin.topic}
              </PinLabel>
            </InteractiveHtml>
          </group>
        );
      })}
    </group>
  );
}


const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  color: #e2e8f0;
  background: #0f172a;
  overflow-x: hidden;
  overflow-y: auto;
`;

const Header = styled.header`
  position: absolute; inset: 0 auto auto 0; right: 0; z-index: 50;
  border-bottom: 1px solid rgba(255,255,255,.1);
  backdrop-filter: blur(10px); background: rgba(15,23,42,.8);
`;
const HeaderInner = styled.div`
  max-width: 80rem; margin: 0 auto; padding: 1rem;
  display: flex; align-items: center; justify-content: space-between;
  @media (max-width: 768px) { padding: 0.875rem 1rem; min-height: 64px; }
`;
const Brand = styled.div` display: flex; align-items: center; gap: .75rem; `;
const LogoImage = styled.div`
  position: relative; width: 120px; height: 40px;
  img { object-fit: contain; }
`;
const Nav = styled.nav`
  display: none; align-items: center; gap: 1.5rem;
  @media (min-width: 768px) { display: flex; }
`;
const NavLink = styled(Link)`
  color: #cbd5e1; text-decoration: none; font-weight: 600;
  transition: color .2s ease; &:hover { color: #fff; }
`;
const Dot = styled.div` width: .6rem; height: .6rem; border-radius: 9999px; `;
const SuccessDot = styled(Dot)` background: #10b981; `;
const ErrorDot = styled(Dot)` background: #ef4444; `;
const ContactBtn = styled(UIButton)`
  border: 1px solid rgba(255,255,255,.3); background: transparent; color: #e5e7eb;
  &:hover { background: rgba(255,255,255,.08); color: #fff; }
  display: inline-flex; align-items: center; gap: .5rem;
`;

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50;
  display: grid; place-items: center; padding: 1rem;
  background: rgba(0,0,0,.6); backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;
const ContactCard = styled.div`
  width: 100%; max-width: 30rem;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border: 1px solid rgba(99,102,241,.3); border-radius: 1.25rem; padding: 2.5rem;
  box-shadow: 0 25px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(99,102,241,.1);
  animation: slideUp 0.3s ease-out;
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 640px) { padding: 1.25rem 1rem 1rem; border-radius: 1rem; }
`;
const ModalTitle = styled.h3`
  margin: 0 0 .75rem; font-size: 1.75rem; font-weight: 900;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text; color: transparent; text-align: center; letter-spacing: -0.02em;
`;
const ModalLead = styled.p` margin: 0 0 1.5rem; color: #cbd5e1; text-align: center; font-size: 1.05rem; line-height: 1.6; `;
const WarningNote = styled.div`
  margin-bottom: 1.5rem; padding: 1rem 1.25rem; border-radius: .75rem;
  background: linear-gradient(135deg, rgba(251,191,36,.12), rgba(245,158,11,.12));
  border: 1px solid rgba(251,191,36,.3); color: #fbbf24; font-size: .95rem; text-align: center; line-height: 1.5;
  strong { font-weight: 700; color: #fcd34d; } u { text-decoration-color: rgba(251,191,36,.5); }
`;
const ErrorBox = styled.div`
  margin-bottom: 1rem; padding: .75rem; border-radius: .5rem;
  background: rgba(185,28,28,.25); border: 1px solid rgba(248,113,113,.5); color: #fecaca; font-size: .9rem;
`;
const InputsCol = styled.div` display: grid; gap: 1rem; `;
const MessageInput = styled.textarea`
  width: 100%; height: 7rem; resize: none; padding: 1rem; border-radius: .75rem;
  background: rgba(51,65,85,.6); border: 1.5px solid #475569;
  color: #e2e8f0; outline: none; font-family: inherit; font-size: 1rem; line-height: 1.6;
  transition: all 0.2s ease;
  &:focus { border-color: #6366f1; background: rgba(51,65,85,.8); box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
  &::placeholder { color: #94a3b8; }
`;
const ModalActions = styled.div`
  display: flex; gap: .75rem; margin-top: .25rem;
  @media (max-width: 640px) { flex-direction: column; }
`;
const SendBtn = styled(UIButton)`
  flex: 1; background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff; border: none; font-weight: 600; padding: .75rem 1.5rem;
  transition: all 0.2s ease; min-height: 48px; touch-action: manipulation;
  &:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,.4); filter: brightness(1.1); }
  &:active { transform: translateY(0); }
`;
const CancelBtn = styled(UIButton)`
  border: 1.5px solid #475569; background: rgba(15,23,42,.8); color: #cbd5e1;
  font-weight: 600; padding: .75rem 1.5rem; transition: all 0.2s ease;
  min-height: 48px; touch-action: manipulation;
  &:hover { background: #1e293b; border-color: #64748b; color: #e5e7eb; }
`;
const SpinnerWrapper = styled.span` display: inline-flex; align-items: center; gap: 0.5rem; `;
const SpinnerSvg = styled.svg`
  animation: spin 1s linear infinite;
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

const Toast = styled.div<{ $bg: string; $bd: string; $fg: string }>`
  position: fixed; top: 6rem; left: 50%; transform: translateX(-50%); z-index: 50;
  padding: 1rem 2rem; border-radius: .9rem; box-shadow: 0 10px 30px rgba(0,0,0,.4);
  background: ${({ $bg }) => $bg}; border: 2px solid ${({ $bd }) => $bd};
  color: ${({ $fg }) => $fg}; display: flex; align-items: center; gap: .75rem;
`;
const SuccessSubtext = styled.div` font-size: 0.9rem; color: #047857; `;
const ErrorSubtext = styled.div` font-size: 0.9rem; color: #b91c1c; `;

const Hero = styled.section`
  position: relative; min-height: 100vh; min-height: 100dvh;
  display: grid; place-items: center; background: #0f172a;
`;

/* Globe fills the entire hero as a background. */
const CanvasWrap = styled.div`
  position: absolute; inset: 0; z-index: 0;
  pointer-events: none;
  display: grid;
  place-items: center;
`;

const GlobeInteractRegion = styled.div`
  width: min(92vw, 760px);
  height: min(92vw, 760px);
  pointer-events: auto;
  cursor: grab;
  touch-action: none;

  &:active { cursor: grabbing; }

  /* Let page scroll outside this region; inside, globe handles gestures. */
  canvas { touch-action: none !important; }

  @media (max-width: 768px) {
    width: min(96vw, 560px);
    height: min(96vw, 560px);
  }
`;

const HeroContent = styled.div`
  position: relative; z-index: 10; text-align: center;
  max-width: 48rem; margin: 0 auto; padding: 0 1rem;
  /* Let clicks pass through to globe/pins; re-enable on interactive children */
  pointer-events: none;
  a, button, [role="note"] { pointer-events: auto; }
`;

const HeroActions = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;
`;

const Tag = styled(UIBadge)`
  margin-bottom: 1.25rem; background: rgba(59,130,246,.18); color: #93c5fd;
  border: 1px solid rgba(147,197,253,.3);
  @media (max-width: 640px) { font-size: 0.85rem; padding: 0.35rem 0.7rem; }
`;
const HeroText = styled.p`
  font-size: clamp(1.1rem, 2.2vw, 1.25rem); color: #e5e7eb; line-height: 1.8; margin: 0 0 1.25rem;
  @media (max-width: 640px) { font-size: 1rem; line-height: 1.6; margin-bottom: 1rem; }
`;
const CTA = styled(UIButton)`
  font-size: 1.1rem; padding: .9rem 2rem;
  background: linear-gradient(90deg, #2563eb, #7c3aed);
  color: #fff; border: none; box-shadow: 0 18px 40px rgba(67,56,202,.35);
  transition: transform .2s ease, filter .2s ease;
  min-height: 52px; min-width: 240px; border-radius: 0.9rem; touch-action: manipulation;
  &:hover { transform: scale(1.03); filter: brightness(1.05); }
  @media (max-width: 640px) { width: min(100%, 20rem); min-width: 0; font-size: 1rem; padding: 0.85rem 1rem; }
`;
const ScrollHint = styled.button`
  position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
  z-index: 20; display: grid; gap: .25rem; place-items: center;
  border: none; background: transparent; cursor: pointer; color: #cbd5e1; font-size: .9rem;
  min-height: 44px; padding: 0.35rem 0.75rem; border-radius: 0.75rem; touch-action: manipulation;
  @media (max-width: 640px) {
    bottom: 1rem; font-size: 0.95rem;
    background: rgba(15,23,42,.55); backdrop-filter: blur(6px);
    border: 1px solid rgba(148,163,184,.2);
  }
`;

/* Story pin labels */
const PinLabel = styled.button<{ $color?: string }>`
  all: unset; cursor: pointer;
  padding: .3rem .65rem .3rem .55rem; border-radius: .5rem;
  font-size: .7rem; font-weight: 500; color: #f1f5f9; white-space: nowrap;
  background: ${({ $color }) => $color ? `${$color}18` : "rgba(15,5,40,.85)"};
  border: 1px solid ${({ $color }) => $color ? `${$color}55` : "rgba(139,92,246,0.2)"};
  border-left: 3px solid ${({ $color }) => $color || "#a78bfa"};
  letter-spacing: 0.02em; backdrop-filter: blur(6px);
  box-shadow: 0 0 12px ${({ $color }) => $color ? `${$color}30` : "rgba(139,92,246,0.15)"};
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  &:hover {
    transform: scale(1.08);
    background: ${({ $color }) => $color ? `${$color}30` : "rgba(15,5,40,.95)"};
    box-shadow: 0 0 20px ${({ $color }) => $color ? `${$color}50` : "rgba(139,92,246,0.3)"};
  }
  &:focus-visible { outline: 2px solid ${({ $color }) => $color || "#a78bfa"}; outline-offset: 2px; }
`;

const InteractiveHtml = styled(Html)`
  pointer-events: auto;
`;

const QuickStartCard = styled.div`
  margin: 1rem auto 0; width: min(100%, 34rem); text-align: left;
  background: rgba(15,23,42,.76); border: 1px solid rgba(96,165,250,.22);
  border-radius: 1rem; padding: 0.9rem 1rem; backdrop-filter: blur(10px);
  box-shadow: 0 14px 30px rgba(2,6,23,.35);
  @media (max-width: 640px) { margin-top: 0.85rem; padding: 0.8rem 0.85rem; border-radius: 0.85rem; }
`;
const QuickStartHead = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.5rem;
`;
const QuickStartTitle = styled.div`
  display: inline-flex; align-items: center; gap: 0.4rem;
  color: #dbeafe; font-weight: 700; font-size: 0.95rem;
`;
const QuickStartClose = styled.button`
  width: 36px; height: 36px; border-radius: 0.7rem;
  border: 1px solid rgba(148,163,184,.2); background: rgba(15,23,42,.35);
  color: #cbd5e1; display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; touch-action: manipulation;
  &:hover { color: #fff; background: rgba(30,41,59,.55); }
`;
const QuickStartList = styled.ol`
  margin: 0; padding-left: 1.1rem; color: #e5e7eb; font-size: 0.9rem; line-height: 1.45;
  li + li { margin-top: 0.2rem; }
  @media (max-width: 640px) { font-size: 0.85rem; }
`;
const QuickStartTip = styled.p`
  margin: 0.55rem 0 0; color: #bfdbfe; font-size: 0.8rem; line-height: 1.35;
  @media (max-width: 640px) { font-size: 0.78rem; }
`;

const Features = styled.section` padding: 5rem 1rem; background: #1e293b; `;
const FeaturesInner = styled.div` max-width: 64rem; margin: 0 auto; `;
const SectionHead = styled.div` text-align: center; margin-bottom: 3rem; `;
const SectionTitle = styled.h3`
  margin: 0 0 .75rem; font-size: clamp(1.8rem, 3vw, 2.25rem); font-weight: 800;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #1e40af 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
`;
const SectionLead = styled.p` color: #cbd5e1; font-size: 1.1rem; margin: 0 auto; max-width: 40rem; `;
const FeatureGrid = styled.div`
  display: grid; gap: 2rem; max-width: 48rem; margin: 0 auto;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
`;
const FeatureCard = styled.div` display: flex; flex-direction: column; align-items: center; text-align: justify; `;
const IconWrap = styled.div`
  width: 5rem; height: 5rem; margin: 0 auto 1rem; display: grid; place-items: center;
  border-radius: 1.25rem; border: 1px solid rgba(59,130,246,.25);
  background: linear-gradient(135deg, rgba(37,99,235,.28), rgba(99,102,241,.28));
  box-shadow: 0 18px 40px rgba(2,6,23,.45);
`;
const FeatureTitle = styled.h4` margin: .5rem 0 .5rem; color: #f8fafc; font-weight: 800; font-size: 1.125rem; `;
const FeatureText = styled.p` color: #cbd5e1; text-align: center; padding: 0 0.5rem; `;

const Footer = styled.footer`
  border-top: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(6px);
  padding: 3rem 1rem; background: rgba(15,23,42,.8);
`;
const FooterInner = styled.div` max-width: 64rem; margin: 0 auto; text-align: center; `;
const FooterBrand = styled.div` display: inline-grid; place-items: center; gap: .75rem; margin-bottom: 1.25rem; `;
const FooterText = styled.p` color: #cbd5e1; margin: 0; `;

const PageLoader = styled.div<{ $loaded: boolean }>`
  position: fixed; inset: 0; z-index: 9999; background: #0f172a;
  opacity: ${({ $loaded }) => ($loaded ? 0 : 1)};
  pointer-events: ${({ $loaded }) => ($loaded ? "none" : "all")};
  transition: opacity 0.3s ease-out;
`;

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [hasBelowFoldContent, setHasBelowFoldContent] = useState(true);
  const [showHomeQuickStart, setShowHomeQuickStart] = useState(false);
  const [message, setMessage] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollIndicator(!(window.scrollY > window.innerHeight * 0.8));
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      setHasBelowFoldContent(document.documentElement.scrollHeight > window.innerHeight + 80);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(homeQuickstartKey) === "1";
    const hiddenForSession = sessionStorage.getItem(homeQuickstartHiddenSessionKey) === "1";
    setShowHomeQuickStart(!dismissed && !hiddenForSession);
  }, []);

  useEffect(() => {
    const targets = [
      HomePageConfig.routes.avatarEntry,
      ...globe_examples.map((s) => buildHomeStoryHref(s.slug)),
    ];
    targets.forEach((href) => { try { router.prefetch(href); } catch {} });
  }, [router]);

  const scrollToFeatures = () => {
    if (typeof window !== "undefined") sessionStorage.setItem(homeQuickstartHiddenSessionKey, "1");
    document.querySelector("#features-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const hideHomeQuickStart = (persist = false) => {
    setShowHomeQuickStart(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(homeQuickstartHiddenSessionKey, "1");
      if (persist) localStorage.setItem(homeQuickstartKey, "1");
    }
  };

  /* Pin click navigates to avatar page with story pre-selected */
  const handlePinClick = (slug: string) => {
    hideHomeQuickStart(false);
    router.push(buildHomeStoryHref(slug));
  };

  const handlePrimaryCtaClick = () => {
    hideHomeQuickStart(false);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      if (!message.trim()) {
        setErrorMessage("Please enter your message.");
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 4000);
        setSending(false);
        return;
      }
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
      if (!serviceId || !templateId || !publicKey) {
        setErrorMessage("Contact form is not configured.");
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 4000);
        setSending(false);
        return;
      }
      await emailjs.send(serviceId, templateId, {
        from_name: user?.profile?.displayName || user?.email || "Anonymous visitor",
        from_email: user?.email || "anonymous@loop.app",
        time: new Date().toLocaleString(),
        message: message.trim(),
        user_authenticated: user ? "Yes" : "No",
      }, publicKey);
      setShowSuccessMessage(true);
      setMessage("");
      setShowContactForm(false);
      setTimeout(() => setShowSuccessMessage(false), 4000);
    } catch (err) {
      console.error("Contact form error:", err);
      setErrorMessage("Something went wrong. Please try again.");
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 4000);
    }
    setSending(false);
  };

  return (
    <Page>
      <PageLoader $loaded={isLoaded} />
      {/* Header */}
      <Header>
        <HeaderInner>
          <Brand>
            <LogoImage>
              <Image src={loop_logo_url} alt="Loop Logo" fill sizes="120px" priority />
            </LogoImage>
          </Brand>
          <Nav>
            <NavLink href="/scenarios">All Stories</NavLink>
            <NavLink href="/progress">Journey</NavLink>
            <NavLink href="/about">About</NavLink>
            {user ? (
              <NavLink href="/creator">{user.role === "CREATOR" || user.role === "ADMIN" ? "Creator" : "Become a Creator"}</NavLink>
            ) : (
              <NavLink href="/login">Sign in</NavLink>
            )}
            <ContactBtn size="sm" onClick={() => setShowContactForm((s) => !s)}>
              <Mail size={16} /> Contact Us
            </ContactBtn>
            {user && (
              <ProfileBubbleChip
                avatarUrl={user.profile?.avatarUrl}
                displayName={user.profile?.displayName || user.email}
                onClick={() => window.location.href = "/profile"}
              />
            )}
          </Nav>
        </HeaderInner>
      </Header>
      {/* Contact modal */}
      {showContactForm && (
        <Overlay onClick={() => setShowContactForm(false)}>
          <ContactCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Contact Us</ModalTitle>
            <ModalLead>Get in touch to learn more about this research project.</ModalLead>
            <WarningNote>
              <strong>Note:</strong> {user
                ? <>Messages are sent from your account and are <u>not anonymous</u>.</>
                : <>Messages sent without an account are anonymous and we can&apos;t reply directly.</>}
            </WarningNote>
            {showErrorMessage && <ErrorBox>{errorMessage}</ErrorBox>}
            <form onSubmit={handleContactSubmit}>
              <InputsCol>
                <MessageInput
                  placeholder="Enter your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
                <ModalActions>
                  <SendBtn type="submit" disabled={sending}>
                    {sending ? (
                      <SpinnerWrapper>
                        <SpinnerSvg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" opacity="0.2" />
                          <path d="M12 2a10 10 0 1 1-9.95 9" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                        </SpinnerSvg>
                        Sending...
                      </SpinnerWrapper>
                    ) : 'Send Message'}
                  </SendBtn>
                  <CancelBtn type="button" variant="outline" onClick={() => setShowContactForm(false)}>Cancel</CancelBtn>
                </ModalActions>
              </InputsCol>
            </form>
          </ContactCard>
        </Overlay>
      )}

      {/* Toasts */}
      {showSuccessMessage && (
        <Toast $bg="#ecfdf5" $bd="#6ee7b7" $fg="#065f46">
          <SuccessDot />
          <div>
            <strong>Message sent successfully!</strong>
            <SuccessSubtext>
              {user?.email
                ? "We'll get back to you soon."
                : "Thanks for reaching out. Anonymous messages don't include contact info, so we won't be able to reply directly."}
            </SuccessSubtext>
          </div>
        </Toast>
      )}
      {showErrorMessage && (
        <Toast $bg="#fef2f2" $bd="#fecaca" $fg="#991b1b">
          <ErrorDot />
          <div>
            <strong>Error</strong>
            <ErrorSubtext>{errorMessage}</ErrorSubtext>
          </div>
        </Toast>
      )}

      {/* Hero: full-screen globe background + overlaid content */}
      <Hero>
        <CanvasWrap>
          <GlobeInteractRegion aria-label="Interactive globe">
            <Canvas camera={{ position: [...HomePageConfig.globe.camera.position] as [number, number, number], fov: HomePageConfig.globe.camera.fov }}>
              <Suspense fallback={null}>
                <Environment preset="night" />
                <ambientLight intensity={HomePageConfig.globe.lights.ambient} />
                {HomePageConfig.globe.lights.points.map((light) => (
                  <pointLight
                    key={`${light.position.join(",")}-${light.color}`}
                    position={[...light.position] as [number, number, number]}
                    intensity={light.intensity}
                    color={light.color}
                  />
                ))}
                <directionalLight
                  position={[...HomePageConfig.globe.lights.directional.position] as [number, number, number]}
                  intensity={HomePageConfig.globe.lights.directional.intensity}
                  color={HomePageConfig.globe.lights.directional.color}
                />
                <InteractiveGlobe onPinClick={handlePinClick} />
                <CinematicCamera />
                <GlobeOrbitControls />
              </Suspense>
            </Canvas>
          </GlobeInteractRegion>
        </CanvasWrap>

        <HeroContent>
          <Tag>{HomePageConfig.hero.badge}</Tag>
          <HeroText>
            {HomePageConfig.hero.titleLines[0]}
            <br />
            {HomePageConfig.hero.titleLines[1]}
          </HeroText>
          <HeroActions>
            <CTA asChild onClick={handlePrimaryCtaClick}>
              <Link href={HomePageConfig.routes.avatarEntry}>{HomePageConfig.hero.ctaLabel}</Link>
            </CTA>
          </HeroActions>

          {showHomeQuickStart && (
            <QuickStartCard role="note" aria-label="How to start">
              <QuickStartHead>
                <QuickStartTitle>
                  {HomePageConfig.hero.quickStart.title}
                </QuickStartTitle>
                <QuickStartClose
                  type="button"
                  onClick={() => hideHomeQuickStart(true)}
                  aria-label="Dismiss how to start guide"
                  title="Dismiss"
                >
                  <X size={16} />
                </QuickStartClose>
              </QuickStartHead>
              <QuickStartList>
                {HomePageConfig.hero.quickStart.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </QuickStartList>
              <QuickStartTip>
                {HomePageConfig.hero.quickStart.tip}
              </QuickStartTip>
            </QuickStartCard>
          )}
        </HeroContent>

        {showScrollIndicator && hasBelowFoldContent && (
          <ScrollHint onClick={scrollToFeatures} aria-label="See Loop's features below">
            <span>{HomePageConfig.hero.scrollHintLabel}</span>
            <ChevronDown size={18} />
          </ScrollHint>
        )}
      </Hero>

      {/* Features */}
      <Features id="features-section">
        <FeaturesInner>
          <SectionHead>
            <SectionTitle>Immersive Learning</SectionTitle>
            <SectionLead>Every choice matters. Every story teaches. Every experience transforms.</SectionLead>
          </SectionHead>
          <FeatureGrid>
            <FeatureCard>
              <IconWrap><Globe size={32} color="#60a5fa" /></IconWrap>
              <FeatureTitle>Cultural Perspectives</FeatureTitle>
              <FeatureText>Understand issues from multiple cultural and geographic viewpoints.</FeatureText>
            </FeatureCard>
            <FeatureCard>
              <IconWrap><Brain size={32} color="#c4b5fd" /></IconWrap>
              <FeatureTitle>Meaningful Choices</FeatureTitle>
              <FeatureText>Make decisions that influence how things unfold and reflect on the outcomes.</FeatureText>
            </FeatureCard>
            <FeatureCard>
              <IconWrap><Heart size={32} color="#f472b6" /></IconWrap>
              <FeatureTitle>Empathy Building</FeatureTitle>
              <FeatureText>Gain insight into others&apos; experiences and build genuine understanding.</FeatureText>
            </FeatureCard>
          </FeatureGrid>
        </FeaturesInner>
      </Features>

      {/* Footer */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <LogoImage>
              <Image src={loop_logo_url} alt="Loop Logo" fill sizes="120px" />
            </LogoImage>
          </FooterBrand>
          <FooterText>Building empathy through immersive experiences</FooterText>
        </FooterInner>
      </Footer>

      <TutorialPrompt href="/hero-example?tab=learn" />
    </Page>
  );
}
