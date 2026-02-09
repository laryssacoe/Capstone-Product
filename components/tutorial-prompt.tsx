"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, BookOpen, ChevronRight } from "lucide-react"
import styled, { keyframes } from "styled-components"

const STORAGE_KEY = "loop-tutorial-visit-count"
const MAX_POPUP_VISITS = 5

interface TutorialPromptProps {
  href?: string
}

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideUp = keyframes`
  from { 
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

const moveToCorner = keyframes`
  0% {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    top: calc(100% - 4rem);
    left: calc(100% - 10rem);
    transform: translate(0, 0) scale(0.8);
    opacity: 0;
  }
`

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
  50% { transform: translateY(-10px) rotate(180deg); opacity: 1; }
`

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.5); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
`

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

const sparkle = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
`

const slideInFromRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} 0.3s ease-out;
`

const CenterCard = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 
    0 0 0 1px rgba(139, 92, 246, 0.1),
    0 25px 50px rgba(0, 0, 0, 0.5),
    0 0 100px rgba(139, 92, 246, 0.15);
  animation: ${slideUp} 0.4s ease-out;
`

const CardGradientBar = styled.div`
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #8b5cf6, #3b82f6);
  background-size: 200% 100%;
  animation: ${shimmer} 3s linear infinite;
`

const FloatingParticle = styled.div<{
  $top?: string
  $left?: string
  $right?: string
  $bottom?: string
  $delay?: string
}>`
  position: absolute;
  top: ${({ $top }) => $top ?? "auto"};
  left: ${({ $left }) => $left ?? "auto"};
  right: ${({ $right }) => $right ?? "auto"};
  bottom: ${({ $bottom }) => $bottom ?? "auto"};
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.5);
  animation: ${float} 3s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay ?? "0s"};
  pointer-events: none;
`

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`

const CardContent = styled.div`
  padding: 2.5rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

const IconContainer = styled.div`
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.3);
  
  .icon {
    color: #a78bfa;
    z-index: 1;
  }
`

const IconGlow = styled.div`
  position: absolute;
  inset: -4px;
  border-radius: 1.25rem;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%);
  filter: blur(8px);
`

const Title = styled.h2`
  margin: 0 0 0.75rem;
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, #c4b5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
`

const Subtitle = styled.p`
  margin: 0 0 1.25rem;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.6;
  max-width: 320px;
`

const VisitBadge = styled.div`
  margin-bottom: 1.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  font-size: 0.8rem;
  font-weight: 500;
`

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 280px;
`

const StartButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(124, 58, 237, 0.5);
    filter: brightness(1.1);
  }
  
  &:active {
    transform: translateY(0);
  }
`

const SkipButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.75rem;
  background: transparent;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(148, 163, 184, 0.5);
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.03);
  }
`

const FooterNote = styled.p`
  margin-top: 1.5rem;
  color: #64748b;
  font-size: 0.8rem;
`

const AnimatingButton = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9998;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);
  animation: ${moveToCorner} 0.6s ease-in-out forwards;
`

const CornerButton = styled.button`
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  text-decoration: none;
  animation: ${slideInFromRight} 0.4s ease-out;
  
  &:hover {
    .sparkle {
      animation: ${sparkle} 0.6s ease-in-out;
    }
  }
`

const ButtonGlow = styled.div`
  position: absolute;
  inset: -2px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.5), rgba(99, 102, 241, 0.4));
  background-size: 200% 200%;
  animation: ${shimmer} 4s linear infinite;
  filter: blur(8px);
  opacity: 0.6;
`

const ButtonInner = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.4rem;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(99, 102, 241, 0.95));
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.01em;
  border: 1px solid rgba(167, 139, 250, 0.6);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
  
  ${CornerButton}:hover & {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(124, 58, 237, 0.35);
  }
`

const PulseRing = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 2px solid rgba(139, 92, 246, 0.4);
  animation: ${pulse} 2.8s ease-out infinite;
`

export function TutorialPrompt({ href = "/hero-example" }: TutorialPromptProps) {
  const [visitCount, setVisitCount] = useState<number | null>(null)
  const [showCenterPopup, setShowCenterPopup] = useState(false)
  const [isAnimatingToCorner, setIsAnimatingToCorner] = useState(false)
  const [showCornerButton, setShowCornerButton] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Get visit count from localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    const count = stored ? parseInt(stored, 10) : 0
    const newCount = count + 1
    
    // Update storage
    localStorage.setItem(STORAGE_KEY, String(newCount))
    setVisitCount(newCount)

    // Show center popup for first 5 visits
    if (newCount <= MAX_POPUP_VISITS) {
      const timer = setTimeout(() => {
        setShowCenterPopup(true)
      }, 800)
      return () => clearTimeout(timer)
    } else {
      // After 5 visits, just show corner button
      setShowCornerButton(true)
    }
  }, [])

  const handleDismiss = () => {
    setShowCenterPopup(false)
    setIsAnimatingToCorner(true)
    
    // After animation, show corner button
    setTimeout(() => {
      setIsAnimatingToCorner(false)
      setShowCornerButton(true)
      setDismissed(true)
    }, 600)
  }

  const handleStartTutorial = () => {
    // Navigate happens via Link
  }

  // Don't render anything until we know the visit count
  if (visitCount === null) return null

  return (
    <>
      {showCenterPopup && !dismissed && (
        <Overlay onClick={handleDismiss}>
          <CenterCard onClick={(e) => e.stopPropagation()}>
            <CardGradientBar />

            <FloatingParticle $top="15%" $left="10%" $delay="0s" />
            <FloatingParticle $top="25%" $right="15%" $delay="0.5s" />
            <FloatingParticle $bottom="20%" $left="20%" $delay="1s" />
            
            <CloseButton onClick={handleDismiss}>
              <X size={18} />
            </CloseButton>

            <CardContent>
              <IconContainer>
                <IconGlow />
                <BookOpen size={32} className="icon" />
              </IconContainer>

              <Title>New to Loop?</Title>
              <Subtitle>
                Take our interactive tutorial to learn how immersive experiences work and make your first choices.
              </Subtitle>

              <VisitBadge>
                Visit {visitCount} of {MAX_POPUP_VISITS} — {MAX_POPUP_VISITS - visitCount + 1} more reminder{MAX_POPUP_VISITS - visitCount === 0 ? '' : 's'}
              </VisitBadge>

              <ButtonGroup>
                <StartButton as={Link} href={href}>
                  Start Tutorial
                  <ChevronRight size={18} />
                </StartButton>
                <SkipButton onClick={handleDismiss}>
                  Maybe Later
                </SkipButton>
              </ButtonGroup>

              <FooterNote>
                You can always access the tutorial from the corner button
              </FooterNote>
            </CardContent>
          </CenterCard>
        </Overlay>
      )}

      {/* Animating element */}
      {isAnimatingToCorner && (
        <AnimatingButton>
          <span>Tutorial</span>
        </AnimatingButton>
      )}

      {/* Corner button */}
      {showCornerButton && (
        <CornerButton as={Link} href={href}>
          <ButtonGlow />
          <ButtonInner>
            <span>Interactive Tutorial</span>
          </ButtonInner>
          <PulseRing />
        </CornerButton>
      )}
    </>
  )
}

export default TutorialPrompt
