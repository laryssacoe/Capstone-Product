"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import styled, { keyframes } from "styled-components"
import { X, ChevronRight, ChevronLeft, PenLine } from "lucide-react"

interface WalkthroughStep {
  target: string 
  title: string
  description: string
  position: "top" | "bottom" | "left" | "right"
}

const baseWalkthroughSteps: WalkthroughStep[] = [
  {
    target: "tab-stories",
    title: "Your Stories",
    description: "This is where all your stories live. We've created an example story for you to explore and edit.",
    position: "bottom",
  },
  {
    target: "example-story-card",
    title: "Example Story",
    description: "This is a simple example with 1 decision and 3 passages. Click Preview to see how it plays, or Edit to modify it.",
    position: "right",
  },
  {
    target: "tab-new",
    title: "Create Stories",
    description: "Build new stories using Loop's JSON format. Define passages (nodes), choices (paths), and how they connect (transitions).",
    position: "bottom",
  },
  {
    target: "tab-import",
    title: "Import from Twine",
    description: "Already have stories in Twine? Upload your exports and we'll convert them to Loop format automatically.",
    position: "bottom",
  },
  {
    target: "create-button",
    title: "Start Creating",
    description: "Ready to build your own story? Click here to start fresh, or edit the example to learn the format.",
    position: "top",
  },
]

const buildWalkthroughSteps = (includeExample: boolean) =>
  baseWalkthroughSteps
    .filter((step) => includeExample || step.target !== "example-story-card")
    .map((step) => {
      if (!includeExample && step.target === "tab-stories") {
        return {
          ...step,
          description: "This is where all your stories live.",
        }
      }
      if (!includeExample && step.target === "create-button") {
        return {
          ...step,
          description: "Ready to build your own story? Click here to start fresh.",
        }
      }
      return step
    })

// Styled Components
const TooltipContainer = styled.div`
  width: 320px;
  background-color: rgb(30, 41, 59);
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(168, 85, 247, 0.2);
  overflow: hidden;
`

const TooltipHeader = styled.div`
  padding: 20px 20px 12px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

const IconContainer = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(168, 85, 247, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c084fc;
`

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const StepIndicator = styled.p`
  font-size: 12px;
  color: #c084fc;
  font-weight: 500;
  margin: 0;
`

const StepTitle = styled.h3`
  color: white;
  font-weight: 600;
  font-size: 18px;
  margin: 0;
`

const CloseButton = styled.button`
  color: rgb(148, 163, 184);
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: white;
  }
`

const TooltipContent = styled.div`
  padding: 0 20px 16px 20px;
`

const Description = styled.p`
  color: rgb(203, 213, 225);
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
`

const ProgressContainer = styled.div`
  padding: 0 20px 16px 20px;
`

const ProgressBar = styled.div`
  display: flex;
  gap: 6px;
`

const ProgressDot = styled.div<{ $active: boolean }>`
  height: 6px;
  flex: 1;
  border-radius: 9999px;
  transition: background-color 0.2s;
  background-color: ${({ $active }) => $active ? '#a855f7' : 'rgb(51, 65, 85)'};
`

const ActionsContainer = styled.div`
  padding: 0 20px 20px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SkipButton = styled.button`
  font-size: 14px;
  color: rgb(148, 163, 184);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: white;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`

const NavButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  ${({ $primary }) => $primary ? `
    background-color: #9333ea;
    color: white;
    border: none;
    
    &:hover {
      background-color: #7c3aed;
    }
  ` : `
    background-color: transparent;
    color: rgb(203, 213, 225);
    border: 1px solid rgb(71, 85, 105);
    
    &:hover {
      background-color: rgb(51, 65, 85);
      color: white;
    }
  `}
`

const OverlayBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
`

const SpotlightCutout = styled.div<{ $top: number; $left: number; $width: number; $height: number; $shadowSize: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  z-index: 10001;
  border-radius: 12px;
  box-shadow: 0 0 0 ${({ $shadowSize }) => $shadowSize}px rgba(0, 0, 0, 0.9);
  pointer-events: none;
`

const SpotlightBorder = styled.div<{ $top: number; $left: number; $width: number; $height: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  z-index: 10001;
  border-radius: 12px;
  border: 2px solid rgba(168, 85, 247, 0.8);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.1);
  pointer-events: none;
`

// Welcome Modal Styled Components
const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10000;
`

const ModalContainer = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 16px;
`

const ModalCard = styled.div`
  width: 100%;
  max-width: 448px;
  background-color: rgb(30, 41, 59);
  border: 1px solid rgb(51, 65, 85);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`

const ModalGradientBar = styled.div`
  height: 8px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
`

const ModalContent = styled.div`
  padding: 32px;
  text-align: center;
`

const ModalIconContainer = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 24px auto;
  border-radius: 16px;
  background-color: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c084fc;
`

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 12px 0;
`

const ModalDescription = styled.p`
  color: rgb(148, 163, 184);
  margin: 0 0 32px 0;
  line-height: 1.6;
`

const ModalButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  
  @media (min-width: 640px) {
    flex-direction: row;
  }
`

const ModalButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  ${({ $primary }) => $primary ? `
    background-color: #9333ea;
    color: white;
    border: none;
    
    &:hover {
      background-color: #7c3aed;
    }
  ` : `
    background-color: transparent;
    color: rgb(203, 213, 225);
    border: 1px solid rgb(71, 85, 105);
    
    &:hover {
      background-color: rgb(51, 65, 85);
      color: white;
    }
  `}
`

const ModalFooterText = styled.p`
  font-size: 12px;
  color: rgb(100, 116, 139);
  margin: 24px 0 0 0;
`

interface CreatorWalkthroughProps {
  onComplete: () => void
  isOpen: boolean
  onTabChange?: (tab: string) => void
  hasExampleStory: boolean
}

export function CreatorWalkthrough({ onComplete, isOpen, onTabChange, hasExampleStory }: CreatorWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({})
  const tooltipRef = useRef<HTMLDivElement>(null)
  const steps = useMemo(() => buildWalkthroughSteps(hasExampleStory), [hasExampleStory])

  // Switch to matched tab when step changes
  useEffect(() => {
    if (!isOpen || !onTabChange) return
    
    const step = steps[currentStep]
    if (!step) return
    if (step.target === "tab-stories" || step.target === "create-button" || step.target === "example-story-card") {
      onTabChange("stories")
    } else if (step.target === "tab-new") {
      onTabChange("new")
    } else if (step.target === "tab-import") {
      onTabChange("import")
    }
  }, [currentStep, isOpen, onTabChange, steps])

  const calculatePosition = useCallback(() => {
    const step = steps[currentStep]
    if (!step) return
    const targetElement = document.querySelector(`[data-walkthrough="${step.target}"]`)
    
    if (!targetElement) return

    const targetRect = targetElement.getBoundingClientRect()
    const padding = 12
    const arrowSize = 8
    const highlightPadding = 8

    // Update spotlight position
    setSpotlightStyle({
      position: "fixed",
      top: `${targetRect.top - highlightPadding}px`,
      left: `${targetRect.left - highlightPadding}px`,
      width: `${targetRect.width + highlightPadding * 2}px`,
      height: `${targetRect.height + highlightPadding * 2}px`,
      zIndex: 10001,
    })

    // Scroll target into view
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" })

    // Wait for tooltip ref to be available
    if (!tooltipRef.current) {
      setTimeout(() => calculatePosition(), 50)
      return
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect()

    let top = 0
    let left = 0

    switch (step.position) {
      case "bottom":
        top = targetRect.bottom + padding + arrowSize + highlightPadding
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
        break
      case "top":
        top = targetRect.top - tooltipRect.height - padding - arrowSize - highlightPadding
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
        break
      case "left":
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2)
        left = targetRect.left - tooltipRect.width - padding - arrowSize - highlightPadding
        break
      case "right":
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2)
        left = targetRect.right + padding + arrowSize + highlightPadding
        break
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    if (left < padding) left = padding
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding
    }
    if (top < padding) top = padding
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding
    }

    setTooltipStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 10002,
    })
  }, [currentStep, steps])

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      return
    }
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      calculatePosition()
    }, 150)

    window.addEventListener("resize", calculatePosition)
    window.addEventListener("scroll", calculatePosition, true)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", calculatePosition)
      window.removeEventListener("scroll", calculatePosition, true)
    }
  }, [isOpen, currentStep, calculatePosition])

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return
    const observer = new MutationObserver(() => calculatePosition())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [calculatePosition, isOpen])

  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(Math.max(0, steps.length - 1))
    }
  }, [currentStep, steps.length])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Go to create new story tab when clicking "Get Started"
      onTabChange?.("new")
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    // Return to stories tab when skipping
    onTabChange?.("stories")
    onComplete()
  }

  if (!isOpen) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <>
      <SpotlightOverlay style={spotlightStyle} onClose={handleSkip} />

      <TooltipContainer ref={tooltipRef} style={tooltipStyle}>
        <TooltipHeader>
          <HeaderContent>
            <IconContainer>
              <PenLine size={20} />
            </IconContainer>
            <div>
              <StepIndicator>
                Step {currentStep + 1} of {steps.length}
              </StepIndicator>
              <StepTitle>{step.title}</StepTitle>
            </div>
          </HeaderContent>
          <CloseButton onClick={handleSkip}>
            <X size={20} />
          </CloseButton>
        </TooltipHeader>

        <TooltipContent>
          <Description>{step.description}</Description>
        </TooltipContent>

        <ProgressContainer>
          <ProgressBar>
            {steps.map((_, index) => (
              <ProgressDot key={index} $active={index <= currentStep} />
            ))}
          </ProgressBar>
        </ProgressContainer>

        <ActionsContainer>
          <SkipButton onClick={handleSkip}>Skip tour</SkipButton>
          <ButtonGroup>
            {!isFirstStep && (
              <NavButton onClick={handlePrev}>
                <ChevronLeft size={16} style={{ marginRight: 4 }} />
                Back
              </NavButton>
            )}
            <NavButton $primary onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ChevronRight size={16} style={{ marginLeft: 4 }} />}
            </NavButton>
          </ButtonGroup>
        </ActionsContainer>
      </TooltipContainer>
    </>
  )
}

// Spotlight overlay with "cutout" effect around the target
function SpotlightOverlay({ 
  style, 
  onClose 
}: { 
  style: React.CSSProperties
  onClose: () => void 
}) {
  const top = parseFloat(style.top as string) || 0
  const left = parseFloat(style.left as string) || 0
  const width = parseFloat(style.width as string) || 0
  const height = parseFloat(style.height as string) || 0
  const shadowSize = Math.max(window.innerWidth, window.innerHeight) * 2

  return (
    <>
      <OverlayBackdrop onClick={onClose} />
      <SpotlightCutout 
        $top={top} 
        $left={left} 
        $width={width} 
        $height={height} 
        $shadowSize={shadowSize} 
      />
      <SpotlightBorder 
        $top={top} 
        $left={left} 
        $width={width} 
        $height={height} 
      />
    </>
  )
}

// Welcome modal for first-time users
interface WelcomeModalProps {
  onStart: () => void
  onSkip: () => void
  isOpen: boolean
}

export function WelcomeModal({ onStart, onSkip, isOpen }: WelcomeModalProps) {
  if (!isOpen) return null

  return (
    <>
      <ModalBackdrop />
      <ModalContainer>
        <ModalCard>
          <ModalGradientBar />
          
          <ModalContent>
            <ModalIconContainer>
              <PenLine size={32} />
            </ModalIconContainer>

            <ModalTitle>Welcome to Creator Tools!</ModalTitle>
            <ModalDescription>
              We&apos;ve created an example story for you to explore. Take a quick tour to learn how everything works!
            </ModalDescription>

            <ModalButtonGroup>
              <ModalButton $primary onClick={onStart}>
                <PenLine size={16} style={{ marginRight: 8 }} />
                Take the Tour
              </ModalButton>
              <ModalButton onClick={onSkip}>
                Skip for Now
              </ModalButton>
            </ModalButtonGroup>

            <ModalFooterText>
              You can restart the tour anytime using the Tutorial Tour button.
            </ModalFooterText>
          </ModalContent>
        </ModalCard>
      </ModalContainer>
    </>
  )
}