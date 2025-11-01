'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styled from 'styled-components';
import { ProgressTracker } from '@/components/progress-tracker';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const Page = styled.div`
  min-height: 100vh;
  color: #fff;
  background: #0f172a;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(8px);
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Container = styled.div<{ $py?: number }>`
  width: 100%;
  max-width: 80rem; /* ~1280px */
  margin: 0 auto;
  padding: 0 1rem;
  ${(p) => p.$py && `padding-top:${p.$py}rem; padding-bottom:${p.$py}rem;`}
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: #d1d5db;
  text-decoration: none;
  transition: color 0.2s ease;
  &:hover { color: #fff; }
  svg { width: 20px; height: 20px; }
`;

const Brand = styled.h1`
  font-weight: 700;
  font-size: 1.5rem;
  color: #60a5fa;
`;

const LogoutButton = styled.button`
  border: 1px solid rgba(96, 165, 250, 0.5);
  border-radius: 999px;
  padding: 0.4rem 1rem;
  color: #bfdbfe;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.9rem;
  &:hover {
    background: rgba(96, 165, 250, 0.1);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Center = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const GradientText = styled.span`
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #1e40af 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const TitleXL = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  margin-bottom: 1.25rem;
`;

const Lead = styled.p`
  color: #d1d5db;
  font-size: 1.125rem;
  line-height: 1.8;
  max-width: 48rem;
  margin: 0 auto;
`;

const TrackerWrap = styled.section`
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(51, 65, 85, 0.35);
  border-radius: 1rem;
  padding: 2rem;
  /* make embedded tracker breathe */
  & > * { width: 100%; }
`;

export default function ProgressPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { user } = useAuth();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Page>
      <Header>
  <Container $py={1}>
          <Row>
            <BackLink href="/">
              <ArrowLeft />
              <span>Back to Experience</span>
            </BackLink>
            <Row style={{ gap: '1rem' }}>
              <Brand>Your Journey</Brand>
              {user && (
                <LogoutButton onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? 'Signing out...' : 'Sign out'}
                </LogoutButton>
              )}
            </Row>
          </Row>
        </Container>
      </Header>

  <Container $py={3}>
        <Center>
          <TitleXL>
            <GradientText>Learning Journey</GradientText>
          </TitleXL>
          <Lead>
            Track your progress in developing empathy and understanding social issues through immersive experiences.
          </Lead>
        </Center>

        <TrackerWrap>
          <ProgressTracker />
        </TrackerWrap>
      </Container>
    </Page>
  );
}
