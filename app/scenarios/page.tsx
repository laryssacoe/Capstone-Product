'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ScenarioBrowser } from '@/components/scenario-browser';
import { ArrowLeft, X, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Scenario } from '@/types/simulation';

const newUserStorageKey = 'loop-scenarios-visited';

const Page = styled.div`
  color: #fff;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.div`
  flex-shrink: 0;
  padding: 1.5rem 1.5rem 0;
  max-width: 100%;
`;

const HeaderInner = styled.div`
  max-width: 90rem;
  margin: 0 auto;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
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
  margin: 0.25rem auto 1.5rem;
  text-align: center;
`;

const NewUserBanner = styled.div`
  max-width: 90rem;
  margin: 0 auto 1.5rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  animation: slideDown 0.3s ease-out;

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const BannerLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BannerText = styled.div`
  color: #e2e8f0;
  font-size: 0.95rem;
  strong { color: #a78bfa; }
`;

const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TutorialBtn = styled(Button)`
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #a78bfa;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  &:hover { background: rgba(139, 92, 246, 0.3); }
`;

const DismissBtn = styled.button`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { background: rgba(255, 255, 255, 0.1); color: #94a3b8; }
`;

const MainContent = styled.div`
  display: flex;
  overflow: hidden;
  padding: 0 1.5rem 0.75rem;
  flex: 1;
`;

const FullWidthLayout = styled.div`
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;
`;

const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const BrowserShell = styled.section<{ $fill?: boolean }>`
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(51, 65, 85, 0.35);
  border-radius: 1rem;
  padding: 1.5rem 1.5rem 0.9rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: ${({ $fill }) => ($fill ? '100%' : 'auto')};
`;

const EmptyPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(51, 65, 85, 0.35);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  height: 100%;
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 1rem;
  color: #a78bfa;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 0.5rem;
`;

const EmptyText = styled.p`
  color: #64748b;
  font-size: 0.9rem;
  margin: 0 0 1.5rem;
  max-width: 280px;
`;

const CreateBtn = styled(Button)`
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border: none;
  color: #fff;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  &:hover { filter: brightness(1.1); }
`;

const FooterCTA = styled.div`
  max-width: 90rem;
  margin: 1.5rem auto 0;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FooterText = styled.div`
  color: #cbd5e1;
  font-size: 0.95rem;
  strong { color: #a78bfa; }
`;

const PlainLink = styled(Link)`
  text-decoration: none;
`;

export default function ScenariosPage() {
  const router = useRouter();
  const [showNewUserBanner, setShowNewUserBanner] = useState(false);
  const [scenarioCount, setScenarioCount] = useState<number | null>(null);

  useEffect(() => {
    const hasVisited = localStorage.getItem(newUserStorageKey);
    if (!hasVisited) {
      setShowNewUserBanner(true);
    }
  }, []);

  const handleDismissBanner = () => {
    localStorage.setItem(newUserStorageKey, 'true');
    setShowNewUserBanner(false);
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    const storySlug =
      (scenario as any)?.metadata?.storySlug ||
      (scenario as any)?.storySlug ||
      (scenario as any)?.slug ||
      scenario.id;

    router.push(`/simulation?story=${encodeURIComponent(storySlug)}`);
  };

  // Callback to receive scenario count from ScenarioBrowser
  const handleScenariosLoaded = (count: number) => {
    setScenarioCount(count);
  };

  // Show split layout only if we have fewer than 2 scenarios
  const showComingSoonPanel = scenarioCount !== null && scenarioCount < 2;

  return (
    <Page>
      <Header>
        <HeaderInner>
          <HeaderRow>
            <BackBtn asChild variant="ghost" size="sm">
              <Link href="/"><ArrowLeft />Back</Link>
            </BackBtn>
          </HeaderRow>

          <Title>Scenarios</Title>
          <Sub>Explore real situations through interactive filters.</Sub>

          {showNewUserBanner && (
            <NewUserBanner>
              <BannerLeft>
                <BannerText>
                  <strong>New to Loop?</strong> Take our interactive tutorial to learn how scenarios work.
                </BannerText>
              </BannerLeft>
              <BannerActions>
                <PlainLink href="/hero-example?tab=learn">
                  <TutorialBtn onClick={handleDismissBanner}>
                    <BookOpen size={16} />
                    Start Tutorial
                    <ChevronRight size={16} />
                  </TutorialBtn>
                </PlainLink>
                <DismissBtn onClick={handleDismissBanner} aria-label="Dismiss">
                  <X size={16} />
                </DismissBtn>
              </BannerActions>
            </NewUserBanner>
          )}
        </HeaderInner>
      </Header>

      <MainContent>
        {showComingSoonPanel ? (
          // Split layout: Browser on left, Coming Soon on right
          <SplitLayout>
            <Panel>
              <BrowserShell $fill>
                <ScenarioBrowser 
                  onScenarioSelect={handleScenarioSelect} 
                  onScenariosLoaded={handleScenariosLoaded}
                />
              </BrowserShell>
            </Panel>
            <Panel>
              <EmptyPanel>
                <EmptyIcon><BookOpen size={28} /></EmptyIcon>
                <EmptyTitle>More Scenarios Coming Soon</EmptyTitle>
                <EmptyText>
                  We&apos;re working on new immersive experiences. Want to contribute your own story?
                </EmptyText>
                <PlainLink href="/creator">
                  <CreateBtn>Become a Creator</CreateBtn>
                </PlainLink>
              </EmptyPanel>
            </Panel>
          </SplitLayout>
        ) : (
          // Full width layout when we have 2+ scenarios
          <FullWidthLayout>
            <BrowserShell>
              <ScenarioBrowser 
                onScenarioSelect={handleScenarioSelect} 
                onScenariosLoaded={handleScenariosLoaded}
              />
            </BrowserShell>
            
            <FooterCTA>
              <FooterText>
                <strong>Want to share your story?</strong> Create your own scenario and help others understand different perspectives.
              </FooterText>
              <PlainLink href="/creator">
                <CreateBtn>Become a Creator</CreateBtn>
              </PlainLink>
            </FooterCTA>
          </FullWidthLayout>
        )}
      </MainContent>
    </Page>
  );
}