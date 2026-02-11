"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import styled from "styled-components"
import {
  Play,
  BookOpen,
  Wrench,
  CheckCircle2,
  ChevronRight,
  Eye,
  Users,
  Heart,
  Brain,
  Lightbulb,
  FileText,
  Upload,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { loop_logo_url } from "@/lib/brand-assets"
import { normalizeImagePath } from "@/lib/story-media-path"

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #f1f5f9;
`

const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const HeaderInner = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
`

const LogoImage = styled.div`
  position: relative;
  width: 120px;
  height: 40px;

  img {
    object-fit: contain;
  }
`

const Nav = styled.nav`
  display: none;
  align-items: center;
  gap: 1.5rem;

  @media (min-width: 768px) {
    display: flex;
  }
`

const NavLink = styled(Link)`
  color: #cbd5e1;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;

  &:hover {
    color: #fff;
  }
`

const ContactBtn = styled(Button)`
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: #e5e7eb;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`

const Main = styled.main`
  padding-top: 80px;
`

const HeroSection = styled.section`
  max-width: 1000px;
  margin: 0 auto;
  padding: 4rem 2rem;
  text-align: center;
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 999px;
  color: #a78bfa;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
`

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 1.5rem;

  span {
    color: #a78bfa;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: #94a3b8;
  max-width: 700px;
  margin: 0 auto 2rem;
  line-height: 1.6;
`

const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
`

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${(props) => (props.$active ? "rgba(139, 92, 246, 0.2)" : "rgba(30, 41, 59, 0.5)")};
  border: 1px solid ${(props) => (props.$active ? "rgba(139, 92, 246, 0.4)" : "rgba(255, 255, 255, 0.1)")};
  border-radius: 0.75rem;
  color: ${(props) => (props.$active ? "#a78bfa" : "#94a3b8")};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.3);
  }
`

const ContentSection = styled.section`
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
  scroll-margin-top: 100px;
`

const Card = styled.div`
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 0.75rem;
  color: #a78bfa;
`

const CardTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #f1f5f9;
`

const CardText = styled.p`
  color: #94a3b8;
  line-height: 1.7;
  margin-bottom: 1rem;
`

const StepList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step;
`

const StepItem = styled.li`
  position: relative;
  padding-left: 3.5rem;
  padding-bottom: 2rem;
  border-left: 2px solid rgba(139, 92, 246, 0.3);
  margin-left: 1rem;

  &:last-child {
    border-left: 2px solid transparent;
    padding-bottom: 0;
  }

  &::before {
    counter-increment: step;
    content: counter(step);
    position: absolute;
    left: -1rem;
    top: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(139, 92, 246, 0.2);
    border: 2px solid rgba(139, 92, 246, 0.4);
    border-radius: 50%;
    color: #a78bfa;
    font-weight: 600;
    font-size: 0.875rem;
  }
`

const StepTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
`

const StepText = styled.p`
  color: #94a3b8;
  line-height: 1.6;
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`

const FeatureCard = styled.div`
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 1.5rem;
`

const FeatureIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  border-radius: 0.5rem;
  color: #a78bfa;
  margin-bottom: 1rem;
`

const FeatureTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
`

const FeatureText = styled.p`
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
`

const ScenarioPreview = styled.div`
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 1rem;
  overflow: hidden;
  margin-top: 1.5rem;
`

const ScenarioImage = styled.div<{ $url?: string }>`
  width: 100%;
  height: 300px;
  background: ${({ $url }) => $url ? `url('${$url}') center/cover no-repeat` : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 50%, rgba(15, 23, 42, 0.9) 100%);
  }
`

const ScenarioContent = styled.div`
  padding: 1.5rem;
`

const ScenarioTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.75rem;
`

const ScenarioText = styled.p`
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 1rem;
`

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`

const Tag = styled.span`
  padding: 0.25rem 0.75rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 999px;
  color: #a78bfa;
  font-size: 0.75rem;
  font-weight: 500;
`

const ActionButton = styled(Button)`
  width: 100%;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #a78bfa;

  &:hover {
    background: rgba(139, 92, 246, 0.3);
  }
`

const CreatorSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`

const CreatorStep = styled.div`
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 1.25rem;
  text-align: center;
`

const CreatorStepNumber = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 50%;
  color: #a78bfa;
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0 auto 0.75rem;
`

const CreatorStepTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.25rem;
`

const CreatorStepText = styled.p`
  color: #64748b;
  font-size: 0.75rem;
`

const CTASection = styled.section`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
  text-align: center;
`

const CTACard = styled.div`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 1.5rem;
  padding: 3rem;
`

const CTATitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 1rem;
`

const CTAText = styled.p`
  color: #94a3b8;
  font-size: 1.125rem;
  margin-bottom: 2rem;
`

const CTAButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
`

const PrimaryButton = styled(Button)`
  background: #8b5cf6;
  color: white;
  padding: 0.75rem 2rem;

  &:hover {
    background: #7c3aed;
  }
`

const SecondaryButton = styled(Button)`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f1f5f9;
  padding: 0.75rem 2rem;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`

// Contact Modal Styles
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ContactCard = styled.div`
  width: 100%;
  max-width: 30rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 1.25rem;
  padding: 2.5rem;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.1);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

const ModalTitle = styled.h3`
  margin: 0 0 0.75rem;
  font-size: 1.75rem;
  font-weight: 900;
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  color: transparent;
  text-align: center;
  letter-spacing: -0.02em;
`

const ModalLead = styled.p`
  margin: 0 0 1.5rem;
  color: #cbd5e1;
  text-align: center;
  font-size: 1.05rem;
  line-height: 1.6;
`

const WarningNote = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.12));
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: #fbbf24;
  font-size: 0.95rem;
  text-align: center;
  line-height: 1.5;

  strong { font-weight: 700; color: #fcd34d; }
  u { text-decoration-color: rgba(251, 191, 36, 0.5); }
`

const ErrorBox = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgba(185, 28, 28, 0.25);
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: #fecaca;
  font-size: 0.9rem;
`

const InputsCol = styled.div`
  display: grid;
  gap: 1rem;
`

const MessageInput = styled.textarea`
  width: 100%;
  height: 7rem;
  resize: none;
  padding: 1rem;
  border-radius: 0.75rem;
  background: rgba(51, 65, 85, 0.6);
  border: 1.5px solid #475569;
  color: #e2e8f0;
  outline: none;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  transition: all 0.2s ease;

  &:focus {
    border-color: #6366f1;
    background: rgba(51, 65, 85, 0.8);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  &::placeholder { color: #94a3b8; }
`

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
`

const SendBtn = styled(Button)`
  flex: 1;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    filter: brightness(1.1);
  }

  &:active { transform: translateY(0); }
`

const CancelBtn = styled(Button)`
  border: 1.5px solid #475569;
  background: rgba(15, 23, 42, 0.8);
  color: #cbd5e1;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: #1e293b;
    border-color: #64748b;
    color: #e5e7eb;
  }
`

const Toast = styled.div<{ $bg: string; $bd: string; $fg: string }>`
  position: fixed;
  top: 6rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 1rem 2rem;
  border-radius: 0.9rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  background: ${({ $bg }) => $bg};
  border: 2px solid ${({ $bd }) => $bd};
  color: ${({ $fg }) => $fg};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const Dot = styled.div<{ $color?: string }>`
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 9999px;
  background: ${({ $color }) => $color || "currentColor"};
`

const ToastContent = styled.div``

const ToastSubtext = styled.div<{ $color: string }>`
  font-size: 0.9rem;
  color: ${({ $color }) => $color};
`

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid rgba(139, 92, 246, 0.2);
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 2rem auto;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const ActionButtonWrapper = styled.div`
  text-align: center;
  margin-top: 2rem;
`

const IconRight = styled.span`
  margin-left: 0.5rem;
  display: inline-flex;
  align-items: center;
`

const IconLeft = styled.span`
  margin-right: 0.5rem;
  display: inline-flex;
  align-items: center;
`

const PlainLink = styled(Link)`
  text-decoration: none;
`

const SendingContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`

const SpinningSvg = styled.svg`
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const FallbackContainer = styled.div`
  min-height: 100vh;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
`

const FallbackContent = styled.div`
  text-align: center;
`

const FallbackDot = styled.div`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #3b82f6;
  margin: 0 auto 1rem;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.95); }
  }
`

// Types for scenario data
interface FeaturedScenario {
  id: string
  title: string
  description: string
  slug: string
  imageUrl: string
  tags: string[]
  socialIssue?: {
    type: string
    description: string
  }
}

function normalizeScenarioImageUrl(value: unknown): string {
  return normalizeImagePath(value)
}

function HeroExamplePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"learn" | "play" | "create">("learn")
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const contentRef = useRef<HTMLElement>(null)
  const [featuredScenario, setFeaturedScenario] = useState<FeaturedScenario | null>(null)
  const [loadingScenario, setLoadingScenario] = useState(true)

  // Contact form state
  const [message, setMessage] = useState("")
  const [showContactForm, setShowContactForm] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showErrorMessage, setShowErrorMessage] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [sending, setSending] = useState(false)

  const ProfileBubbleChip = require("@/components/profile-bubble-chip").ProfileBubbleChip

  // Fetch featured scenario
  useEffect(() => {
    async function fetchFeaturedScenario() {
      setLoadingScenario(true)
      try {
        const res = await fetch("/api/scenarios", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : []
          const bySlug = new Map<
            string,
            {
              scenario: any
              slug: string
              imageUrl: string
              score: number
            }
          >()
          const scenarioOrder: string[] = []

          for (const scenario of scenarios) {
            const slug = scenario?.metadata?.storySlug || scenario?.storySlug || scenario?.slug || scenario?.id
            if (!slug) continue

            const avatarImage =
              normalizeScenarioImageUrl(scenario?.metadata?.avatarImage) ||
              normalizeScenarioImageUrl(scenario?.metadata?.appearance?.image) ||
              normalizeScenarioImageUrl(scenario?.imageUrl) ||
              ""
            const source = typeof scenario?.metadata?.source === "string" ? scenario.metadata.source : ""
            const sourceScore = source === "avatar" ? 2 : source === "story" ? 1 : 0
            const score = (avatarImage ? 2 : 0) + sourceScore

            if (!bySlug.has(slug)) {
              bySlug.set(slug, { scenario, slug, imageUrl: avatarImage, score })
              scenarioOrder.push(slug)
              continue
            }

            const current = bySlug.get(slug)
            if (current && score > current.score) {
              bySlug.set(slug, { scenario, slug, imageUrl: avatarImage, score })
            }
          }

          const firstSlug = scenarioOrder[0]
          const selected = firstSlug ? bySlug.get(firstSlug) : null

          if (selected) {
            const { scenario, slug, imageUrl } = selected
            setFeaturedScenario({
              id: scenario.id,
              title: scenario.title || "Featured Scenario",
              description: scenario.description || scenario.socialIssue?.description || "",
              slug,
              imageUrl,
              tags: [
                scenario.socialIssue?.type || "Social Issue",
                ...(scenario.tags || []),
              ].filter(Boolean).slice(0, 4),
              socialIssue: scenario.socialIssue,
            })
          }
        }
      } catch (err) {
        console.warn("Failed to fetch featured scenario:", err)
      } finally {
        setLoadingScenario(false)
      }
    }

    fetchFeaturedScenario()
  }, [])

  const handleTabChange = (tab: "learn" | "play" | "create") => {
    setActiveTab(tab)
    router.push(`/hero-example?tab=${tab}`, { scroll: false })
    
    // Scroll to content section if not initial load
    if (!isInitialLoad && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 50)
    }
  }

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "learn" || tab === "play" || tab === "create") {
      setActiveTab(tab)
    }
    // Mark initial load complete after first render
    setIsInitialLoad(false)
  }, [searchParams])

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      if (!message) {
        setErrorMessage("Please enter your message.")
        setShowErrorMessage(true)
        setTimeout(() => setShowErrorMessage(false), 4000)
        setSending(false)
        return
      }
      const senderName = user?.profile?.displayName || user?.email || "Anonymous visitor"
      const senderEmail = user?.email ?? null
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: senderName, email: senderEmail, message, anonymous: !user }),
      })
      const data = await res.json()
      if (data.success) {
        setShowSuccessMessage(true)
        setMessage("")
        setShowContactForm(false)
        setTimeout(() => setShowSuccessMessage(false), 4000)
      } else {
        setErrorMessage(data.error || "Something went wrong. Please try again.")
        setShowErrorMessage(true)
        setTimeout(() => setShowErrorMessage(false), 4000)
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.")
      setShowErrorMessage(true)
      setTimeout(() => setShowErrorMessage(false), 4000)
    }
    setSending(false)
  }

  // Helper to get scenario link
  const getScenarioLink = () => {
    if (!featuredScenario) return "/scenarios"
    return `/simulation?story=${encodeURIComponent(featuredScenario.slug)}`
  }

  return (
    <Container>
      {/* Header */}
      <Header>
        <HeaderInner>
          <Brand href="/">
            <LogoImage>
              <Image src={loop_logo_url} alt="Loop Logo" fill sizes="120px" priority />
            </LogoImage>
          </Brand>
          <Nav>
            <NavLink href="/scenarios">Explore</NavLink>
            <NavLink href="/progress">Journey</NavLink>
            <NavLink href="/about">About</NavLink>
            {user ? (
              <NavLink href="/creator">
                {user.role === "CREATOR" || user.role === "ADMIN" ? "Creator" : "Become a Creator"}
              </NavLink>
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
                onClick={() => (window.location.href = "/profile")}
              />
            )}
          </Nav>
        </HeaderInner>
      </Header>

      {/* Contact Modal */}
      {showContactForm && (
        <Overlay onClick={() => setShowContactForm(false)}>
          <ContactCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Contact Us</ModalTitle>
            <ModalLead>Get in touch to learn more about this research project.</ModalLead>
            <WarningNote>
              <strong>Note:</strong>{" "}
              {user ? (
                <>Messages are sent from your account and are <u>not anonymous</u>.</>
              ) : (
                <>Messages sent without an account are anonymous and we can&apos;t reply directly.</>
              )}
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
                      <SendingContent>
                        <SpinningSvg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" opacity="0.2" />
                          <path d="M12 2a10 10 0 1 1-9.95 9" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                        </SpinningSvg>
                        Sending...
                      </SendingContent>
                    ) : (
                      "Send Message"
                    )}
                  </SendBtn>
                  <CancelBtn type="button" variant="outline" onClick={() => setShowContactForm(false)}>
                    Cancel
                  </CancelBtn>
                </ModalActions>
              </InputsCol>
            </form>
          </ContactCard>
        </Overlay>
      )}

      {/* Toasts */}
      {showSuccessMessage && (
        <Toast $bg="#ecfdf5" $bd="#6ee7b7" $fg="#065f46">
          <Dot $color="#10b981" />
          <ToastContent>
            <strong>Message sent successfully!</strong>
            <ToastSubtext $color="#047857">
              {user?.email ? "We'll get back to you soon." : "Thanks for reaching out."}
            </ToastSubtext>
          </ToastContent>
        </Toast>
      )}
      {showErrorMessage && (
        <Toast $bg="#fef2f2" $bd="#fecaca" $fg="#991b1b">
          <Dot $color="#ef4444" />
          <ToastContent>
            <strong>Error</strong>
            <ToastSubtext $color="#b91c1c">{errorMessage}</ToastSubtext>
          </ToastContent>
        </Toast>
      )}

      <Main>
        <HeroSection>
          <Badge>Interactive Tutorial</Badge>
          <Title>Welcome to <span>Loop</span></Title>
          <Subtitle>
            This interactive guide will show you how Loop works, let you experience a sample scenario, and teach you how to create your own immersive stories.
          </Subtitle>

          <TabContainer>
            <Tab $active={activeTab === "learn"} onClick={() => handleTabChange("learn")}>
              <BookOpen size={18} />
              Learn How It Works
            </Tab>
            <Tab $active={activeTab === "play"} onClick={() => handleTabChange("play")}>
              <Play size={18} />
              Play Example Scenario
            </Tab>
            <Tab $active={activeTab === "create"} onClick={() => handleTabChange("create")}>
              <Wrench size={18} />
              Create Your Own
            </Tab>
          </TabContainer>
        </HeroSection>

        <ContentSection ref={contentRef}>
          {activeTab === "learn" && (
            <>
              <Card>
                <CardHeader>
                  <CardIcon><Eye size={24} /></CardIcon>
                  <CardTitle>What is Loop?</CardTitle>
                </CardHeader>
                <CardText>
                  Loop is an immersive social simulation platform that helps people understand different life experiences through interactive storytelling. By stepping into the shoes of characters facing real-world challenges, users develop empathy and gain insight into systemic issues they may not encounter in their own lives.
                </CardText>
                <CardText>
                  Unlike traditional educational content, Loop makes abstract concepts tangible through constrained decision-making. You feel the weight of limited options, time pressure, and competing priorities that many people face daily.
                </CardText>

                <FeatureGrid>
                  <FeatureCard>
                    <FeatureIcon><Users size={20} /></FeatureIcon>
                    <FeatureTitle>Perspective Taking</FeatureTitle>
                    <FeatureText>Experience life from viewpoints different from your own, building genuine understanding.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureIcon><Brain size={20} /></FeatureIcon>
                    <FeatureTitle>Constrained Choices</FeatureTitle>
                    <FeatureText>Make decisions under realistic limitations to understand systemic barriers.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureIcon><Heart size={20} /></FeatureIcon>
                    <FeatureTitle>Emotional Impact</FeatureTitle>
                    <FeatureText>Stories designed to create lasting emotional connections and insights.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureIcon><Lightbulb size={20} /></FeatureIcon>
                    <FeatureTitle>Reflection Prompts</FeatureTitle>
                    <FeatureText>Guided questions help process experiences and connect to real-world issues.</FeatureText>
                  </FeatureCard>
                </FeatureGrid>
              </Card>

              <Card>
                <CardHeader>
                  <CardIcon><CheckCircle2 size={24} /></CardIcon>
                  <CardTitle>How to Experience a Scenario</CardTitle>
                </CardHeader>
                <StepList>
                  <StepItem>
                    <StepTitle>Choose Your Scenario</StepTitle>
                    <StepText>Browse available scenarios and select one that interests you. Each scenario focuses on different perspectives and social issues.</StepText>
                  </StepItem>
                  <StepItem>
                    <StepTitle>Read and Immerse</StepTitle>
                    <StepText>Each scene presents you with a situation and context. Take your time to understand the character&apos;s circumstances before making decisions.</StepText>
                  </StepItem>
                  <StepItem>
                    <StepTitle>Make Choices</StepTitle>
                    <StepText>When presented with options, consider the trade-offs carefully. There are no &quot;right&quot; answers — only different paths with different consequences.</StepText>
                  </StepItem>
                  <StepItem>
                    <StepTitle>Reflect on Outcomes</StepTitle>
                    <StepText>At the end, you&apos;ll receive a summary of your journey and reflection prompts to help you process what you experienced.</StepText>
                  </StepItem>
                </StepList>
              </Card>

              <ActionButtonWrapper>
                <ActionButton onClick={() => handleTabChange("play")}>
                  Try the Example Scenario
                  <IconRight><ChevronRight size={18} /></IconRight>
                </ActionButton>
              </ActionButtonWrapper>
            </>
          )}

          {activeTab === "play" && (
            <>
              <Card>
                <CardHeader>
                  <CardIcon><Play size={24} /></CardIcon>
                  <CardTitle>Featured Scenario{featuredScenario ? `: ${featuredScenario.title}` : ""}</CardTitle>
                </CardHeader>
                
                {loadingScenario ? (
                  <LoadingSpinner />
                ) : featuredScenario ? (
                  <>
                    <CardText>{featuredScenario.socialIssue?.description || featuredScenario.description}</CardText>

                    <ScenarioPreview>
                      <ScenarioImage $url={featuredScenario.imageUrl} />
                      <ScenarioContent>
                        <ScenarioTitle>{featuredScenario.title}</ScenarioTitle>
                        <ScenarioText>{featuredScenario.description}</ScenarioText>
                        <TagRow>
                          {featuredScenario.tags.map((tag, i) => (
                            <Tag key={i}>{tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, " ")}</Tag>
                          ))}
                        </TagRow>
                        <PlainLink href={getScenarioLink()}>
                          <ActionButton>
                            <IconLeft><Play size={18} /></IconLeft>
                            Start {featuredScenario.title}
                          </ActionButton>
                        </PlainLink>
                      </ScenarioContent>
                    </ScenarioPreview>
                  </>
                ) : (
                  <CardText>No scenarios available yet. Check back soon!</CardText>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardIcon><FileText size={24} /></CardIcon>
                  <CardTitle>What This Scenario Demonstrates</CardTitle>
                </CardHeader>
                <FeatureGrid>
                  <FeatureCard>
                    <FeatureTitle>Branching Narratives</FeatureTitle>
                    <FeatureText>Multiple distinct endings based on your choices, each exploring different consequences and trade-offs.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureTitle>Soft Metrics Tracking</FeatureTitle>
                    <FeatureText>Behind the scenes, the system tracks health, finances, and stress to inform the narrative.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureTitle>Scene Images</FeatureTitle>
                    <FeatureText>Each node includes contextual imagery to enhance immersion and emotional connection.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureTitle>Reflection Prompts</FeatureTitle>
                    <FeatureText>Endings include thought-provoking questions about systemic vs personal responsibility.</FeatureText>
                  </FeatureCard>
                </FeatureGrid>
              </Card>

              <ActionButtonWrapper>
                <ActionButton onClick={() => handleTabChange("create")}>
                  Learn How to Create Your Own
                  <IconRight><ChevronRight size={18} /></IconRight>
                </ActionButton>
              </ActionButtonWrapper>
            </>
          )}

          {activeTab === "create" && (
            <>
              <Card>
                <CardHeader>
                  <CardIcon><Wrench size={24} /></CardIcon>
                  <CardTitle>Creating Stories with Loop</CardTitle>
                </CardHeader>
                <CardText>
                  Loop empowers educators, advocates, and storytellers to create their own immersive scenarios. Whether you want to teach about social issues, explore ethical dilemmas, or share personal narratives, our tools make it accessible.
                </CardText>

                <CreatorSteps>
                  <CreatorStep>
                    <CreatorStepNumber>1</CreatorStepNumber>
                    <CreatorStepTitle>Write Your Story</CreatorStepTitle>
                    <CreatorStepText>Use our editor or import from Twine</CreatorStepText>
                  </CreatorStep>
                  <CreatorStep>
                    <CreatorStepNumber>2</CreatorStepNumber>
                    <CreatorStepTitle>Add Media</CreatorStepTitle>
                    <CreatorStepText>Include images, audio, and context</CreatorStepText>
                  </CreatorStep>
                  <CreatorStep>
                    <CreatorStepNumber>3</CreatorStepNumber>
                    <CreatorStepTitle>Set Up Branches</CreatorStepTitle>
                    <CreatorStepText>Define choices and consequences</CreatorStepText>
                  </CreatorStep>
                  <CreatorStep>
                    <CreatorStepNumber>4</CreatorStepNumber>
                    <CreatorStepTitle>Preview & Publish</CreatorStepTitle>
                    <CreatorStepText>Test and share with the community</CreatorStepText>
                  </CreatorStep>
                </CreatorSteps>
              </Card>

              <Card>
                <CardHeader>
                  <CardIcon><Upload size={24} /></CardIcon>
                  <CardTitle>Import from Twine</CardTitle>
                </CardHeader>
                <CardText>
                  Already have stories in Twine? Loop supports direct import of Twine HTML files. Your passages, links, and metadata are automatically converted to our format while preserving your narrative structure.
                </CardText>
                <StepList>
                  <StepItem>
                    <StepTitle>Export from Twine</StepTitle>
                    <StepText>In Twine, go to your story menu and select &quot;Publish to File&quot; to export your story as an HTML file.</StepText>
                  </StepItem>
                  <StepItem>
                    <StepTitle>Upload to Loop</StepTitle>
                    <StepText>In the Creator Dashboard, go to &quot;Import from Twine&quot; and upload your exported HTML file.</StepText>
                  </StepItem>
                  <StepItem>
                    <StepTitle>Review & Enhance</StepTitle>
                    <StepText>Add images, adjust styling, and add any Loop-specific features like emotion tracking or reflection prompts.</StepText>
                  </StepItem>
                </StepList>
              </Card>

              <Card>
                <CardHeader>
                  <CardIcon><CheckCircle2 size={24} /></CardIcon>
                  <CardTitle>Best Practices for Loop Stories</CardTitle>
                </CardHeader>
                <FeatureGrid>
                  <FeatureCard>
                    <FeatureTitle>Authentic Perspectives</FeatureTitle>
                    <FeatureText>Involve people with lived experience in your story development process.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureTitle>Meaningful Choices</FeatureTitle>
                    <FeatureText>Each decision should have real consequences that reveal the character&apos;s situation.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureTitle>Avoid Stereotypes</FeatureTitle>
                    <FeatureText>Present nuanced characters whose identities are not their only defining trait.</FeatureText>
                  </FeatureCard>
                  <FeatureCard>
                    <FeatureTitle>Include Reflection</FeatureTitle>
                    <FeatureText>End with prompts that help users connect the story to broader systemic issues.</FeatureText>
                  </FeatureCard>
                </FeatureGrid>
              </Card>
            </>
          )}
        </ContentSection>

        <CTASection>
          <CTACard>
            <CTATitle>Ready to Get Started?</CTATitle>
            <CTAText>
              Experience immersive stories, or start creating your own. Loop is designed to make empathy-building accessible to everyone.
            </CTAText>
            <CTAButtons>
              <Link href={getScenarioLink()}>
                <PrimaryButton>
                  <IconLeft><Play size={18} /></IconLeft>
                  {featuredScenario ? `Play ${featuredScenario.title}` : "Play Featured Scenario"}
                </PrimaryButton>
              </Link>
              <Link href="/creator?walkthrough=true">
                <SecondaryButton>
                  <IconLeft><Wrench size={18} /></IconLeft>
                  Start Creating
                </SecondaryButton>
              </Link>
              <Link href="/scenarios">
                <SecondaryButton>
                  <IconLeft><BookOpen size={18} /></IconLeft>
                  Browse All Scenarios
                </SecondaryButton>
              </Link>
            </CTAButtons>
          </CTACard>
        </CTASection>
      </Main>
    </Container>
  )
}

export default function HeroExamplePage() {
  return (
    <Suspense
      fallback={
        <FallbackContainer>
          <FallbackContent>
            <FallbackDot />
            <p>Loading...</p>
          </FallbackContent>
        </FallbackContainer>
      }
    >
      <HeroExamplePageContent />
    </Suspense>
  )
}
