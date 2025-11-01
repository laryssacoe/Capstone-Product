'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ScenarioBrowser } from '@/components/scenario-browser';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Scenario } from '@/types/simulation';

const INTERACTIONS_ENABLED = false;

const Page = styled.div`
  min-height: 100vh;
  color: #fff;
  background: #0f172a;
`;

const Container = styled.div<{ $py?: number }>`
  width: 100%;
  max-width: 80rem; /* ~1280px */
  margin: 0 auto;
  padding: 0 1.5rem;
  ${(p) => p.$py && `padding-top:${p.$py}rem; padding-bottom:${p.$py}rem;`}
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const BackBtn = styled(Button)`
  color: #cbd5e1;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.4rem 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  &:hover {
    color: #ffffff;
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.15);
  }

  svg { width: 16px; height: 16px; }
`;

const Title = styled.h1`
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  margin: 0 0 0.5rem;
  background: linear-gradient(90deg, #60a5fa, #c084fc, #93c5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
`;

const Sub = styled.p`
  color: #cbd5e1;
  font-size: 1.06rem;
  line-height: 1.75;
  max-width: 48rem;
  margin: 0.25rem auto 2rem;
  text-align: center;
`;

const BrowserShell = styled.section`
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(51, 65, 85, 0.35);
  border-radius: 1rem;
  padding: 1.5rem;
`;

export default function ScenariosPage() {
  const router = useRouter();

  const handleScenarioSelect = (scenario: Scenario) => {
    // Keep filters usable, but block starting a scenario for now
    if (!INTERACTIONS_ENABLED) return;
    localStorage.setItem('selectedScenario', JSON.stringify(scenario));
    router.push('/avatar');
  };

  return (
    <Page>
  <Container $py={2}>
        <HeaderRow>
          <BackBtn asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft />
              Back
            </Link>
          </BackBtn>
        </HeaderRow>

        <Title>Scenarios</Title>
        <Sub>Explore real situations through interactive filters.</Sub>

        <BrowserShell>
          {/* Filters inside ScenarioBrowser remain fully interactive */}
          <ScenarioBrowser onScenarioSelect={handleScenarioSelect} />
        </BrowserShell>
      </Container>
    </Page>
  );
}
