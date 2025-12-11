"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import styled, { keyframes } from "styled-components"
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Heart, 
  Eye, 
  Brain, 
  Trophy,
  Target,
  TrendingUp,
  Loader2
} from "lucide-react"
import type { TrackedScenario, UserProgress } from "@/types/simulation"

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
`

const SpinningLoader = styled(Loader2)`
  width: 32px;
  height: 32px;
  color: #a78bfa;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 16px;
`

const LoadingText = styled.p`
  color: rgb(148, 163, 184);
  margin: 0;
`

const ErrorContainer = styled.div`
  text-align: center;
  padding: 48px 0;
`

const ErrorIconWrapper = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 24px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(167, 139, 250, 0.1);
`

const ErrorTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 12px 0;
`

const ErrorMessage = styled.p`
  color: rgb(148, 163, 184);
  margin: 0 0 32px 0;
  max-width: 448px;
  margin-left: auto;
  margin-right: auto;
`

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  
  @media (min-width: 640px) {
    flex-direction: row;
  }
`

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 8px;
  background-color: #7c3aed;
  color: white;
  text-decoration: none;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
`

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 8px;
  background-color: transparent;
  color: white;
  text-decoration: none;
  border: 1px solid rgb(71, 85, 105);
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgb(30, 41, 59);
  }
`

const FooterText = styled.p`
  color: rgb(100, 116, 139);
  font-size: 14px;
  margin: 24px 0 0 0;
`

const FooterLink = styled(Link)`
  color: #a78bfa;
  text-decoration: underline;
  
  &:hover {
    color: #c4b5fd;
  }
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 48px;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  
  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StatCard = styled.div<{ $bgColor: string; $borderColor: string }>`
  border-radius: 12px;
  padding: 20px;
  border: 1px solid ${({ $borderColor }) => $borderColor};
  text-align: center;
  background-color: ${({ $bgColor }) => $bgColor};
`

const StatValue = styled.p<{ $color: string }>`
  font-size: 30px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: ${({ $color }) => $color};
`

const StatLabel = styled.p`
  font-size: 14px;
  color: rgb(148, 163, 184);
  margin: 0;
`

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SectionTitleSmall = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

const MetricsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const MetricCard = styled.div`
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background-color: rgba(30, 41, 59, 0.5);
`

const MetricHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`

const MetricLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const MetricIconWrapper = styled.div<{ $bgColor: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $bgColor }) => $bgColor};
`

const MetricLabel = styled.p`
  font-weight: 500;
  color: white;
  margin: 0;
`

const MetricDescription = styled.p`
  font-size: 14px;
  color: rgb(100, 116, 139);
  margin: 0;
`

const MetricValue = styled.span<{ $color: string }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ $color }) => $color};
`

const ProgressBarBg = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 9999px;
  background-color: rgba(51, 65, 85, 0.5);
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  border-radius: 9999px;
  transition: all 0.5s;
  width: ${({ $width }) => $width}%;
  background-color: ${({ $color }) => $color};
`

const AchievementsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const AchievementCard = styled.div`
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(51, 65, 85, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(30, 41, 59, 0.3);
`

const AchievementIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(251, 191, 36, 0.1);
`

const AchievementTitle = styled.p`
  color: white;
  font-weight: 500;
  margin: 0;
`

const AchievementPoints = styled.p`
  font-size: 14px;
  color: rgb(100, 116, 139);
  margin: 0;
`

const StoriesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const StoryCard = styled.div`
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(51, 65, 85, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(30, 41, 59, 0.3);
`

const StoryLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const StoryColorBar = styled.div<{ $color: string }>`
  width: 8px;
  height: 40px;
  border-radius: 9999px;
  background-color: ${({ $color }) => $color};
`

const StoryTitle = styled.p`
  color: white;
  font-weight: 500;
  margin: 0;
`

const StoryCategory = styled.p`
  font-size: 14px;
  color: rgb(100, 116, 139);
  margin: 0;
`

const StoryTime = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: rgb(100, 116, 139);
`

const StoryLink = styled(Link)`
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(30, 41, 59, 0.5);
  text-decoration: none;
  transition: border-color 0.2s;
  
  &:hover {
    border-color: rgba(139, 92, 246, 0.5);
  }
`

const StoryLinkTime = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: rgb(148, 163, 184);
`

const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 32px 0 16px 0;
`

const EmptyStateIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin: 0 auto 16px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(96, 165, 250, 0.1);
`

const EmptyStateTitle = styled.h3`
  font-size: 18px;
  font-weight: 500;
  color: white;
  margin: 0 0 8px 0;
`

const EmptyStateText = styled.p`
  color: rgb(148, 163, 184);
  margin: 0;
`

const FooterSection = styled.div`
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid rgba(51, 65, 85, 0.5);
`

interface ProgressTrackerProps {
  userId?: string
  className?: string
}

export function ProgressTracker({ userId = "demo-user", className }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const signInPrompt = "In order to start and see your journey, sign in."

  const normalizeProgress = (data: UserProgress): UserProgress => ({
    ...data,
    achievements: data.achievements?.map((achievement) => ({
      ...achievement,
      unlockedAt: new Date(achievement.unlockedAt),
    })) ?? [],
    lastActive: data.lastActive ? new Date(data.lastActive) : null,
    scenarios: data.scenarios ?? [],
  })

  useEffect(() => {
    let cancelled = false
    async function loadProgress() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/progress", { cache: "no-store" })
        if (!response.ok) {
          if (response.status === 401) {
            setError(signInPrompt)
            return
          }
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error ?? "To load progress, please sign in.")
        }
        const data = await response.json()
        if (!cancelled) {
          setProgress(normalizeProgress({ ...data, userId: data.userId ?? userId } as UserProgress))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load progress.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProgress()
    return () => {
      cancelled = true
    }
  }, [userId])

  // Loading state
  if (loading) {
    return (
      <LoadingContainer className={className}>
        <SpinningLoader />
        <LoadingText>Loading your journey...</LoadingText>
      </LoadingContainer>
    )
  }

  // Error/Sign-in state
  if (error || !progress) {
    return (
      <ErrorContainer className={className}>
        <ErrorIconWrapper>
          <BookOpen size={40} color="#a78bfa" />
        </ErrorIconWrapper>
        <ErrorTitle>Track Your Learning Journey</ErrorTitle>
        <ErrorMessage>{error ?? signInPrompt}</ErrorMessage>
        <ButtonGroup>
          <PrimaryButton href="/login">Sign In</PrimaryButton>
          <SecondaryButton href="/register">Create Account</SecondaryButton>
        </ButtonGroup>
        <FooterText>
          Or{" "}
          <FooterLink href="/scenarios">explore stories</FooterLink>{" "}
          without an account
        </FooterText>
      </ErrorContainer>
    )
  }

  // Calculate values
  const empathyLevel = Math.floor(progress.totalEmpathyScore / 100) + 1
  const completedScenarios = progress.scenarios.filter((s) => s.completed)
  const totalTimeMinutes = progress.timeSpent ?? 0

  const inProgressScenarios = progress.scenarios.filter((s) => {
    if (s.completed) return false
    // Check if user has started story
    const metadata = s.metadata as Record<string, unknown> | null
    const hasProgress = metadata?.hasStarted === true || 
                        metadata?.currentPassageId !== undefined ||
                        metadata?.visitedPassages !== undefined ||
                        ((s as any).timeSpent !== undefined && (s as any).timeSpent > 0)
    return hasProgress
  })

  // Empathy metrics based on real data
  const empathyMetrics = [
    {
      id: "perspectives",
      label: "Perspectives Understood",
      description: "Different life situations you've explored",
      current: progress.issuesExplored.length,
      goal: 10,
      icon: Eye,
      color: "#a78bfa", 
    },
    {
      id: "scenarios",
      label: "Scenarios Completed",
      description: "Stories you've experienced to the end",
      current: progress.scenariosCompleted,
      goal: progress.totalScenarios || 8,
      icon: Brain,
      color: "#60a5fa", 
    },
    {
      id: "empathy",
      label: "Empathy Score",
      description: "Your overall empathy development",
      current: progress.totalEmpathyScore,
      goal: empathyLevel * 100,
      icon: Heart,
      color: "#f472b6", 
    },
  ]

  // Category colors for stories
  const getCategoryColor = (issueTag: string | null) => {
    const colors: Record<string, string> = {
      "immigration": "#a78bfa",
      "disability": "#60a5fa",
      "racism": "#f472b6",
      "poverty": "#34d399",
      "ageism": "#fbbf24",
      "gender": "#ec4899",
      "lgbtq": "#8b5cf6",
      "mental-health": "#06b6d4",
    }
    return colors[issueTag ?? ""] ?? "#94a3b8"
  }

  const formatIssueTag = (tag: string | null) => {
    if (!tag) return "Social Challenge"
    return tag
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatTime = (minutes: number) => {
    if (minutes > 60) {
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    }
    return `~${minutes}m`
  }

  // Check if user has any activity at all
  const hasAnyActivity = completedScenarios.length > 0 || inProgressScenarios.length > 0 || progress.timeSpent > 0

  return (
    <Container className={className}>
      {/* Stats Cards */}
      <StatsGrid>
        <StatCard $bgColor="rgba(167, 139, 250, 0.1)" $borderColor="rgba(167, 139, 250, 0.3)">
          <StatValue $color="#a78bfa">
            {progress.scenariosCompleted}/{progress.totalScenarios}
          </StatValue>
          <StatLabel>Stories Completed</StatLabel>
        </StatCard>
        <StatCard $bgColor="rgba(96, 165, 250, 0.1)" $borderColor="rgba(96, 165, 250, 0.3)">
          <StatValue $color="#60a5fa">
            {progress.issuesExplored.length}
          </StatValue>
          <StatLabel>Perspectives Explored</StatLabel>
        </StatCard>
        <StatCard $bgColor="rgba(244, 114, 182, 0.1)" $borderColor="rgba(244, 114, 182, 0.3)">
          <StatValue $color="#f472b6">
            {formatTime(totalTimeMinutes)}
          </StatValue>
          <StatLabel>Time Invested</StatLabel>
        </StatCard>
      </StatsGrid>

      {/* Empathy Building Progress */}
      <div>
        <SectionTitle>
          <Heart size={20} color="#f472b6" />
          Empathy Building Progress
        </SectionTitle>
        <MetricsContainer>
          {empathyMetrics.map((metric) => {
            const Icon = metric.icon
            const percentage = Math.min(100, Math.round((metric.current / metric.goal) * 100))
            return (
              <MetricCard key={metric.id}>
                <MetricHeader>
                  <MetricLeft>
                    <MetricIconWrapper $bgColor={`${metric.color}20`}>
                      <Icon size={20} color={metric.color} />
                    </MetricIconWrapper>
                    <div>
                      <MetricLabel>{metric.label}</MetricLabel>
                      <MetricDescription>{metric.description}</MetricDescription>
                    </div>
                  </MetricLeft>
                  <MetricValue $color={metric.color}>
                    {metric.current}/{metric.goal}
                  </MetricValue>
                </MetricHeader>
                <ProgressBarBg>
                  <ProgressBarFill $width={percentage} $color={metric.color} />
                </ProgressBarBg>
              </MetricCard>
            )
          })}
        </MetricsContainer>
      </div>

      {/* Achievements Section: only show if user has actually unlocked achievements */}
      {progress.achievements && progress.achievements.length > 0 && progress.scenariosCompleted > 0 && (
        <div>
          <SectionTitleSmall>
            <Trophy size={20} color="#fbbf24" />
            Achievements Unlocked
          </SectionTitleSmall>
          <AchievementsGrid>
            {progress.achievements.slice(0, 4).map((achievement) => (
              <AchievementCard key={achievement.id}>
                <AchievementIcon>
                  <Trophy size={20} color="#fbbf24" />
                </AchievementIcon>
                <div>
                  <AchievementTitle>{achievement.title}</AchievementTitle>
                  <AchievementPoints>+{achievement.points} pts</AchievementPoints>
                </div>
              </AchievementCard>
            ))}
          </AchievementsGrid>
        </div>
      )}

      {/* Completed Stories */}
      {completedScenarios.length > 0 && (
        <div>
          <SectionTitleSmall>
            <CheckCircle2 size={20} color="#34d399" />
            Completed Stories
          </SectionTitleSmall>
          <StoriesList>
            {completedScenarios.slice(0, 5).map((scenario) => (
              <StoryCard key={scenario.id}>
                <StoryLeft>
                  <StoryColorBar $color={getCategoryColor(scenario.issueTag)} />
                  <div>
                    <StoryTitle>{scenario.title}</StoryTitle>
                    <StoryCategory>{formatIssueTag(scenario.issueTag)}</StoryCategory>
                  </div>
                </StoryLeft>
                {scenario.estimatedMinutes && (
                  <StoryTime>
                    <Clock size={16} />
                    {scenario.estimatedMinutes}m
                  </StoryTime>
                )}
              </StoryCard>
            ))}
          </StoriesList>
        </div>
      )}

      {/* Continue Your Journey show only if user has started stories */}
      {inProgressScenarios.length > 0 && (
        <div>
          <SectionTitleSmall>
            <BookOpen size={20} color="#60a5fa" />
            Continue Your Journey
          </SectionTitleSmall>
          <StoriesList>
            {inProgressScenarios.slice(0, 3).map((scenario) => {
              const storySlug = (scenario.metadata as Record<string, unknown>)?.storySlug as string ?? scenario.id
              return (
                <StoryLink key={scenario.id} href={`/simulation?story=${storySlug}`}>
                  <div>
                    <StoryTitle>{scenario.title}</StoryTitle>
                    <StoryCategory>{formatIssueTag(scenario.issueTag)}</StoryCategory>
                  </div>
                  {scenario.estimatedMinutes && (
                    <StoryLinkTime>
                      <Clock size={16} />
                      {scenario.estimatedMinutes} min
                    </StoryLinkTime>
                  )}
                </StoryLink>
              )
            })}
          </StoriesList>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyActivity && (
        <EmptyStateContainer>
          <EmptyStateIcon>
            <Target size={32} color="#60a5fa" />
          </EmptyStateIcon>
          <EmptyStateTitle>Start Your First Story</EmptyStateTitle>
          <EmptyStateText>
            Begin exploring perspectives to track your empathy journey.
          </EmptyStateText>
        </EmptyStateContainer>
      )}

      <FooterSection>
        <PrimaryButton href="/scenarios">
          Explore More Stories
        </PrimaryButton>
      </FooterSection>
    </Container>
  )
}