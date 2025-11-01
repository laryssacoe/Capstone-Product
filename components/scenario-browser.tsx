'use client';

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Scenario } from '@/types/simulation';
import {
  Search as SearchIcon,
  Clock,
  Users,
  AlertTriangle,
  Heart,
  Brain,
  Scale,
} from 'lucide-react';

// Styled Components
const Wrap = styled.div`
  display: grid;
  gap: 2rem;
`;

const FilterCard = styled.div`
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 1rem;
  padding: 1.5rem;
`;

const FilterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
`;

const SearchGlyph = styled(SearchIcon)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #94a3b8; /* slate-400 */
`;

const SearchInput = styled(Input)`
  padding-left: 2.25rem;
  background: rgba(51, 65, 85, 0.5);
  border-color: #475569;
  color: #fff;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #60a5fa;
    box-shadow: none;
  }
`;

const IssueTrigger = styled(SelectTrigger)`
  width: 12rem;
  background: rgba(51, 65, 85, 0.5);
  border-color: #475569;
  color: #fff;
`;

const IssueContent = styled(SelectContent)`
  background: #1f2937;
  border-color: #334155;
  color: #e5e7eb;
`;

const Grid = styled.div`
  display: grid;
  gap: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SCard = styled(Card)<{ dim?: boolean }>`
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(51, 65, 85, 0.5);
  backdrop-filter: blur(6px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  ${(p) => p.dim && 'opacity: 0.6;'}

  &:hover {
    border-color: #475569;
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.1);
  }
`;

const SHeader = styled(CardHeader)`
  padding-bottom: 1rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const IconBox = styled.div`
  padding: 0.5rem;
  border-radius: 0.75rem;
  background: rgba(51, 65, 85, 0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const STitle = styled(CardTitle)`
  font-size: 1.25rem;
  line-height: 1.25;
  color: #fff;
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

type Hue = 'blue' | 'purple' | 'amber' | 'indigo' | 'slate' | 'emerald';

const TypeBadge = styled(Badge)<{ hue: Hue }>`
  --bg: ${({ hue }) =>
    hue === 'blue'
      ? 'rgba(59,130,246,.20)'
      : hue === 'purple'
      ? 'rgba(168,85,247,.20)'
      : hue === 'amber'
      ? 'rgba(245,158,11,.20)'
      : hue === 'indigo'
      ? 'rgba(99,102,241,.20)'
      : hue === 'slate'
      ? 'rgba(100,116,139,.20)'
      : 'rgba(16,185,129,.20)'};
  --fg: ${({ hue }) =>
    hue === 'blue'
      ? '#93c5fd'
      : hue === 'purple'
      ? '#d8b4fe'
      : hue === 'amber'
      ? '#fcd34d'
      : hue === 'indigo'
      ? '#c7d2fe'
      : hue === 'slate'
      ? '#cbd5e1'
      : '#86efac'};
  --bd: ${({ hue }) =>
    hue === 'blue'
      ? 'rgba(59,130,246,.30)'
      : hue === 'purple'
      ? 'rgba(168,85,247,.30)'
      : hue === 'amber'
      ? 'rgba(245,158,11,.30)'
      : hue === 'indigo'
      ? 'rgba(99,102,241,.30)'
      : hue === 'slate'
      ? 'rgba(100,116,139,.30)'
      : 'rgba(16,185,129,.30)'};

  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--bd);

  /* Title Case look: normal text with slight tracking */
  text-transform: none;
  letter-spacing: 0.02em;
`;

type Level = 'beginner' | 'intermediate' | 'advanced';

const LevelBadge = styled(Badge)<{ level: Level }>`
  background: ${({ level }) =>
    level === 'beginner'
      ? 'rgba(16,185,129,.20)'
      : level === 'intermediate'
      ? 'rgba(234,179,8,.20)'
      : 'rgba(239,68,68,.20)'};
  color: ${({ level }) =>
    level === 'beginner'
      ? '#86efac'
      : level === 'intermediate'
      ? '#fde68a'
      : '#fca5a5'};
  border: 1px solid
    ${({ level }) =>
      level === 'beginner'
        ? 'rgba(16,185,129,.35)'
        : level === 'intermediate'
        ? 'rgba(234,179,8,.35)'
        : 'rgba(239,68,68,.35)'};
  text-transform: none;
`;

const SDescription = styled(CardDescription)`
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.75;
`;

const SContent = styled(CardContent)`
  display: grid;
  gap: 1rem;
`;

const Highlight = styled.div`
  background: rgba(51, 65, 85, 0.3);
  border-radius: 0.75rem;
  padding: 1rem;
`;

const HighlightTitle = styled.h5`
  color: #fff;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const HighlightText = styled.p`
  color: #cbd5e1;
  line-height: 1.7;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 0.9rem;
`;

const MetaLeft = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const PrimaryButton = styled(Button)`
  width: 100%;
  color: #fff;
  background-image: linear-gradient(90deg, #2563eb, #7c3aed);
  border: 0;
  padding: 0.75rem 1rem;
  font-weight: 600;

  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyWrap = styled.div`
  text-align: center;
  padding: 4rem 1rem;
`;

const EmptyCard = styled.div`
  background: rgba(30, 41, 59, 0.5);
  border-radius: 1rem;
  padding: 2rem;
  max-width: 28rem;
  margin: 0 auto;
`;

const EmptyTitle = styled.h3`
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`;

const EmptyText = styled.p`
  color: #94a3b8;
`;

// Helper functions
const toTitleCase = (s: string) =>
  s
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\B\w/g, (c) => c.toLowerCase()); // ensures only first letter stays upper-case

type HueMap = Record<string, Hue>;
const HUE_BY_TYPE: HueMap = {
  racism: 'blue',
  disability: 'purple',
  poverty: 'amber',
  'mental-health': 'indigo',
  ageism: 'slate',
};

const issueHue = (raw: string): Hue =>
  HUE_BY_TYPE[raw.toLowerCase()] ?? 'emerald';

const IssueIcon = (raw: string) => {
  const t = raw.toLowerCase();
  if (t === 'racism') return <Users width={20} height={20} />;
  if (t === 'disability') return <Heart width={20} height={20} />;
  if (t === 'poverty') return <AlertTriangle width={20} height={20} />;
  if (t === 'mental-health') return <Brain width={20} height={20} />;
  if (t === 'ageism') return <Clock width={20} height={20} />;
  return <Scale width={20} height={20} />;
};

const difficultyBadge = (scenario: Scenario): { label: string; level: Level } => {
  const total = Object.values(scenario.minimumResources).reduce((s, n) => s + n, 0);
  if (total < 100) return { label: 'Beginner', level: 'beginner' };
  if (total < 200) return { label: 'Intermediate', level: 'intermediate' };
  return { label: 'Advanced', level: 'advanced' };
};

const canPlayScenario = (scenario: Scenario, userResources?: any) => {
  if (!userResources) return true;
  return Object.entries(scenario.minimumResources).every(
    ([k, req]) => (userResources as any)[k] >= req
  );
};

interface ScenarioBrowserProps {
  onScenarioSelect: (scenario: Scenario) => void;
  userResources?: any;
}

export function ScenarioBrowser({ onScenarioSelect, userResources }: ScenarioBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState<string>('all');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadScenarios() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/scenarios', { cache: 'no-store' });
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : null;

        if (!response.ok) {
          throw new Error((data && data.error) || raw || 'Unable to load scenarios.');
        }

        if (!cancelled) {
          setScenarios((data?.scenarios ?? []) as Scenario[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load scenarios.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadScenarios();

    return () => {
      cancelled = true;
    };
  }, []);

  const issueTypes = useMemo(() => {
    const types = new Set<string>();
    scenarios.forEach((scenario) => {
      types.add(scenario.socialIssue.type);
    });
    return Array.from(types).sort();
  }, [scenarios]);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter((scenario) => {
      const hay = `${scenario.title} ${scenario.description} ${scenario.socialIssue.type}`.toLowerCase();
      const matchesSearch = hay.includes(searchTerm.toLowerCase());
      const matchesIssueType =
        selectedIssueType === 'all' || scenario.socialIssue.type === selectedIssueType;
      return matchesSearch && matchesIssueType;
    });
  }, [scenarios, searchTerm, selectedIssueType]);

  return (
    <Wrap>
      {/* Filters */}
      <FilterCard>
        <FilterRow>
          <SearchWrap>
            <SearchGlyph />
            <SearchInput
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchWrap>

          <Select value={selectedIssueType} onValueChange={setSelectedIssueType}>
            <IssueTrigger>
              <SelectValue placeholder="Filter by issue" />
            </IssueTrigger>
            <IssueContent>
              <SelectItem value="all">All Issues</SelectItem>
              {issueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {/* Filter UI: Title Case */}
                  {toTitleCase(type)}
                </SelectItem>
              ))}
            </IssueContent>
          </Select>
        </FilterRow>
      </FilterCard>

      {/* Results */}
      {loading ? (
        <EmptyWrap>
          <EmptyCard>
            <SearchIcon width={48} height={48} color="#94a3b8" />
            <EmptyTitle>Loading scenarios…</EmptyTitle>
            <EmptyText>Please wait while we prepare the journeys.</EmptyText>
          </EmptyCard>
        </EmptyWrap>
      ) : error ? (
        <EmptyWrap>
          <EmptyCard>
            <SearchIcon width={48} height={48} color="#ef4444" />
            <EmptyTitle>Unable to load scenarios</EmptyTitle>
            <EmptyText>{error}</EmptyText>
          </EmptyCard>
        </EmptyWrap>
      ) : (
        <>
          <Grid>
            {filteredScenarios.map((scenario) => {
              const diff = difficultyBadge(scenario);
              const canPlay = canPlayScenario(scenario, userResources);

              return (
                <SCard key={scenario.id} dim={!canPlay}>
                  <SHeader>
                    <TitleRow>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <IconBox>{IssueIcon(scenario.socialIssue.type)}</IconBox>
                        <div>
                          <STitle>{scenario.title}</STitle>
                          <BadgeRow>
                            <TypeBadge hue={issueHue(scenario.socialIssue.type)}>
                              {toTitleCase(scenario.socialIssue.type)}
                            </TypeBadge>
                            <LevelBadge level={diff.level}>{diff.label}</LevelBadge>
                          </BadgeRow>
                        </div>
                      </div>
                    </TitleRow>
                    <SDescription>{scenario.description}</SDescription>
                  </SHeader>

                  <SContent>
                    <Highlight>
                      <HighlightTitle>Primary Challenge:</HighlightTitle>
                      <HighlightText>{scenario.socialIssue.description}</HighlightText>
                    </Highlight>

                    <MetaRow>
                      <MetaLeft>
                        <Clock width={16} height={16} />
                        {scenario.estimatedDuration} minutes
                      </MetaLeft>
                      <span>{scenario.decisions.length} decision points</span>
                    </MetaRow>

                    <PrimaryButton
                      onClick={() => onScenarioSelect(scenario)}
                      disabled={!canPlay}
                    >
                      {canPlay ? 'Begin Scenario' : 'Insufficient Resources'}
                    </PrimaryButton>
                  </SContent>
                </SCard>
              );
            })}
          </Grid>

          {filteredScenarios.length === 0 && (
            <EmptyWrap>
              <EmptyCard>
                <SearchIcon width={48} height={48} color="#94a3b8" />
                <EmptyTitle>No scenarios found</EmptyTitle>
                <EmptyText>Try adjusting your search or filters.</EmptyText>
              </EmptyCard>
            </EmptyWrap>
          )}
        </>
      )}
    </Wrap>
  );
}
