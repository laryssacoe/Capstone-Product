"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import styled from "styled-components"
import { ArrowLeft, LogOut } from "lucide-react"
import { ProgressTracker } from "@/components/progress-tracker"
import { useAuth } from "@/hooks/use-auth"

const PageContainer = styled.div`
  min-height: 100vh;
  color: white;
  background-color: #0f172a;
`

const Header = styled.header`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: rgba(15, 23, 42, 0.8);
`

const HeaderContent = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const BackLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(148, 163, 184);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: white;
  }
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const PageTitle = styled.h1`
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin: 0;
`

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  color: rgb(203, 213, 225);
  border: 1px solid rgb(71, 85, 105);
  border-radius: 9999px;
  background-color: rgba(30, 41, 59, 0.5);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: white;
    border-color: rgb(100, 116, 139);
    background-color: rgba(51, 65, 85, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const MainContent = styled.main`
  max-width: 1280px;
  margin: 0 auto;
  padding: 48px 16px;
`

const ContentWrapper = styled.div`
  max-width: 896px;
  margin: 0 auto;
`

const TitleSection = styled.div`
  margin-bottom: 48px;
`

const MainTitle = styled.h2`
  font-size: 30px;
  font-weight: 700;
  color: white;
  margin: 0 0 12px 0;
`

const Subtitle = styled.p`
  color: rgb(148, 163, 184);
  margin: 0;
  font-size: 16px;
`

export default function ProgressPage() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const { user } = useAuth()

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <PageContainer>
      <Header>
        <HeaderContent>
          <BackLink href="/">
            <ArrowLeft size={20} />
            <span>Back to Experience</span>
          </BackLink>
          <HeaderRight>
            <PageTitle>Your Journey</PageTitle>
            {user && (
              <LogoutButton onClick={handleLogout} disabled={loggingOut}>
                <LogOut size={16} />
                {loggingOut ? "Signing out..." : "Sign out"}
              </LogoutButton>
            )}
          </HeaderRight>
        </HeaderContent>
      </Header>

      <MainContent>
        <ContentWrapper>
          <TitleSection>
            <MainTitle>Learning Journey</MainTitle>
            <Subtitle>
              Track your growth in understanding different perspectives and social challenges.
            </Subtitle>
          </TitleSection>

          <ProgressTracker />
        </ContentWrapper>
      </MainContent>
    </PageContainer>
  )
}