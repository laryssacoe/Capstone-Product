'use client';

import Link from 'next/link';
import styled, { css } from 'styled-components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Database, Users, Target } from 'lucide-react';

const Page = styled.div`
  min-height: 100vh;
  color: #fff;
  background: #0f172a;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  backdrop-filter: blur(8px);
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 50;
`;

const Container = styled.div<{ py?: number }>`
  width: 100%;
  max-width: 72rem; /* ~1152px */
  margin: 0 auto;
  padding: 0 1rem;
  ${(p) =>
    p.py &&
    css`
      padding-top: ${p.py}rem;
      padding-bottom: ${p.py}rem;
    `}
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
  &:hover {
    color: #fff;
  }
`;

const Brand = styled.h1`
  font-weight: 700;
  font-size: 1.5rem;
  color: #60a5fa;
`;

const Section = styled.div`
  width: 100%;
`;

const Center = styled.div`
  text-align: center;
  margin-bottom: 4rem;
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

const Grid = styled.div`
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Card = styled.div`
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 1rem;
  padding: 2rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
`;

const Muted = styled.p`
  color: #d1d5db;
  line-height: 1.8;
`;

const Panel = styled.div`
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(51, 65, 85, 0.3);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 4rem;
`;

const SubTitle = styled.h3`
  font-size: 1.875rem;
  font-weight: 700;
  margin-left: 0.25rem;
`;

const SubGrid = styled.div`
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const SubSectionTitle = styled.h4<{ color?: string }>`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: ${(p) => p.color || '#93c5fd'};
`;

const List = styled.ul`
  color: #d1d5db;
  display: grid;
  gap: 0.5rem;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const Tag = styled.span<{ hue: 'blue' | 'purple' | 'green' | 'pink' }>`
  --bg: ${(p) =>
    p.hue === 'blue'
      ? 'rgba(59,130,246,.20)'
      : p.hue === 'purple'
      ? 'rgba(168,85,247,.20)'
      : p.hue === 'green'
      ? 'rgba(16,185,129,.20)'
      : 'rgba(236,72,153,.20)'};
  --bd: ${(p) =>
    p.hue === 'blue'
      ? 'rgba(59,130,246,.30)'
      : p.hue === 'purple'
      ? 'rgba(168,85,247,.30)'
      : p.hue === 'green'
      ? 'rgba(16,185,129,.30)'
      : 'rgba(236,72,153,.30)'};
  --fg: ${(p) =>
    p.hue === 'blue'
      ? '#93c5fd'
      : p.hue === 'purple'
      ? '#d8b4fe'
      : p.hue === 'green'
      ? '#86efac'
      : '#f9a8d4'};
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.875rem;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--bd);
`;

const CTAWrap = styled.div`
  text-align: center;
`;

const CTAIntro = styled.p`
  color: #d1d5db;
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
`;

const CTAButton = styled(Button)`
  font-size: 1.125rem;
  padding: 0.75rem 2rem;
  color: #fff !important;
  background-image: linear-gradient(90deg, #2563eb, #7c3aed);
  border: 0;
  box-shadow: 0 5px 18px rgba(79, 70, 229, 0.35);
  transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    filter: brightness(1.05);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.45);
  }
`;

export default function AboutPage() {
  return (
    <Page>
      <Header>
        <Container py={1}>
          <Row>
            <BackLink href="/">
              <ArrowLeft width={20} height={20} />
              <span>Back to Experience</span>
            </BackLink>
            <Brand>About Loop</Brand>
          </Row>
        </Container>
      </Header>

      <Container py={3}>
        <Section>
          <Center>
            <TitleXL>
              <GradientText>Thesis Project</GradientText>
            </TitleXL>
            <Lead>
              Loop is an immersive social awareness platform developed as part of undergraduate academic project to
              understand empathy-building through interactive storytelling and perspective-taking experiences.
            </Lead>
          </Center>

          <Grid>
            <Card>
              <CardHeader>
                <Target width={32} height={32} color="#60a5fa" />
                <CardTitle>Research Objective</CardTitle>
              </CardHeader>
              <Muted>
                PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER
                PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER
                PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER.
              </Muted>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen width={32} height={32} color="#c084fc" />
                <CardTitle>Academic Context</CardTitle>
              </CardHeader>
              <Muted>
                PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER
                PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER
                PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER.
              </Muted>
            </Card>
          </Grid>

          <Panel>
            <CardHeader style={{ marginBottom: '1.5rem' }}>
              <Database width={32} height={32} color="#34d399" />
              <SubTitle>Data &amp; Methodology</SubTitle>
            </CardHeader>

            <SubGrid>
              <div>
                <SubSectionTitle color="#93c5fd">Data Sources</SubSectionTitle>
                <List>
                  <li>• Real-world social issue case studies</li>
                  <li>• Academic research on empathy development</li>
                  <li>• User interaction and decision-making patterns</li>
                  <li>• Psychological assessment frameworks</li>
                </List>
              </div>
              <div>
                <SubSectionTitle color="#d8b4fe">Research Methods</SubSectionTitle>
                <List>
                  <li>• Interactive scenario-based learning</li>
                  <li>• Perspective-taking simulations</li>
                  <li>• Behavioral tracking and analysis</li>
                  <li>• Qualitative user experience studies</li>
                </List>
              </div>
            </SubGrid>
          </Panel>

          <Card style={{ marginBottom: '3rem' }}>
            <CardHeader style={{ marginBottom: '1.5rem' }}>
              <Users width={32} height={32} color="#f472b6" />
              <SubTitle>Impact &amp; Goals</SubTitle>
            </CardHeader>
            <Muted style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
              The ultimate goal is to demonstrate how technology can be leveraged to create more empathetic, socially aware
              individuals who better understand the complexities of social issues and the diverse experiences of others in
              our interconnected world.
            </Muted>
            <TagRow>
              <Tag hue="blue">Empathy Development</Tag>
              <Tag hue="purple">Social Awareness</Tag>
              <Tag hue="green">Educational Technology</Tag>
              <Tag hue="pink">Behavioral Research</Tag>
            </TagRow>
          </Card>

          <CTAWrap>
            <CTAIntro>Ready to contribute to this research by exploring different perspectives?</CTAIntro>
            <CTAButton asChild size="lg">
              <Link href="/avatar">Start Your Journey</Link>
            </CTAButton>
          </CTAWrap>
        </Section>
      </Container>
    </Page>
  );
}