'use client';

import { useEffect, useMemo, useState, useCallback, useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  Card,
  CardContent,
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
  Play,
  User,
  BookOpen,
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

const Grid = styled.div<{ $count: number; $forceTwoColumns?: boolean }>`
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;
  justify-items: stretch;
  align-items: stretch;

  @media (min-width: 560px) {
    grid-template-columns: ${({ $count, $forceTwoColumns }) =>
      $forceTwoColumns
        ? 'repeat(2, minmax(0, 1fr))'
        : $count >= 2
        ? 'repeat(2, minmax(0, 1fr))'
        : `repeat(${$count || 1}, minmax(260px, 1fr))`};
  }
`;

const CardMeasureWrap = styled.div`
  height: 100%;
`;

const TitleMainRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SCard = styled(Card)<{ dim?: boolean }>`
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(51, 65, 85, 0.5);
  backdrop-filter: blur(6px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  ${(p) => p.dim && 'opacity: 0.6;'}

  &:hover {
    border-color: #475569;
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.1);
  }
`;

const SHeader = styled(CardHeader)`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 1rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const IconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(51, 65, 85, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  
  svg {
    width: 24px;
    height: 24px;
    color: #94a3b8;
  }

  .default-book-icon {
    width: 18px;
    height: 18px;
  }
`;

const AvatarImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const STitle = styled(CardTitle)`
  font-size: 1.25rem;
  line-height: 1.3;
  color: #fff;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
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

const InProgressBadge = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  z-index: 5;
`;

const SDescription = styled.div`
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.75;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.75rem;
`;

const SContent = styled(CardContent)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
`;

const Highlight = styled.div`
  background: rgba(51, 65, 85, 0.3);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-top: 0;
  margin-bottom: 1.25rem;
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

const PrimaryButton = styled(Button)<{ $isResume?: boolean }>`
  width: 100%;
  margin-top: 0.25rem;
  color: #fff;
  background-image: ${({ $isResume }) =>
    $isResume
      ? 'linear-gradient(90deg, #059669, #10b981)'
      : 'linear-gradient(90deg, #2563eb, #7c3aed)'};
  border: 0;
  padding: 0.75rem 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

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
  immigration: 'emerald',
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
  if (t === 'immigration') return <Scale width={20} height={20} />;
  return <User width={20} height={20} />;
};

// Get scenario profile image 
const getScenarioImage = (scenario: Scenario): string | null => {
  // Check metadata for appearance.image
  const imagePath =
    (scenario as any)?.metadata?.appearance?.image ||
    (scenario as any)?.metadata?.avatarImage ||
    "";
  
  // Trust image paths in /scenes/ directory or Cloudinary URLs
  if (imagePath && (
    imagePath.startsWith("/scenes/") ||
    imagePath.includes("cloudinary.com") ||
    imagePath.includes("res.cloudinary.com")
  )) {
    return imagePath;
  }

  // Return null for invalid or placeholder paths to show icon fallback
  return null;
};

// Get story slug from scenario
const getStorySlug = (scenario: Scenario): string => {
  return (
    (scenario as any)?.metadata?.storySlug ||
    (scenario as any)?.storySlug ||
    (scenario as any)?.slug ||
    scenario.id
  );
};

const canPlayScenario = (scenario: Scenario, userResources?: any) => {
  if (!userResources || !scenario.minimumResources) return true;
  return Object.entries(scenario.minimumResources).every(
    ([k, req]) => (userResources as any)[k] >= req
  );
};

interface ScenarioBrowserProps {
  onScenarioSelect: (scenario: Scenario) => void;
  onScenariosLoaded?: (count: number) => void;
  userResources?: any;
}

export function ScenarioBrowser({
  onScenarioSelect,
  onScenariosLoaded,
  userResources,
}: ScenarioBrowserProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const descriptionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState<string>('all');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState<Record<string, boolean>>({});

  // Memoize the callback to prevent infinite loops
  const notifyLoaded = useCallback(
    (count: number) => {
      if (onScenariosLoaded) {
        onScenariosLoaded(count);
      }
    },
    [onScenariosLoaded]
  );

  // Check for saved progress for each scenario
  useEffect(() => {
    async function checkSavedProgress() {
      if (typeof window === 'undefined') return;

      const sessionId = localStorage.getItem('loop_session_id');
      if (!sessionId || scenarios.length === 0) return;

      const progressMap: Record<string, boolean> = {};

      for (const scenario of scenarios) {
        const storySlug = getStorySlug(scenario);
        try {
          const res = await fetch(
            `/api/saves?storySlug=${encodeURIComponent(storySlug)}&sessionId=${encodeURIComponent(sessionId)}`
          );
          if (res.ok) {
            const data = await res.json();
            // Check if there's a save that's not at the start
            const hasMeaningfulProgress = data.saves?.some(
              (save: any) => !save.completed && save.currentPassageId && save.currentPassageId !== 'start'
            );
            if (hasMeaningfulProgress) {
              progressMap[scenario.id] = true;
            }
          }
        } catch (e) {
          // Ignore errors for individual saves
        }
      }

      setSavedProgress(progressMap);
    }

    if (scenarios.length > 0) {
      checkSavedProgress();
    }
  }, [scenarios]);

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
          const items = (data?.scenarios ?? []) as Scenario[];
          const unique = Array.from(new Map(items.map((s) => [s.id, s])).values());
          setScenarios(unique);
          notifyLoaded(unique.length);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load scenarios.');
          notifyLoaded(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadScenarios();

    return () => {
      cancelled = true;
    };
  }, [notifyLoaded]);

  const issueTypes = useMemo(() => {
    const types = new Set<string>();
    scenarios.forEach((scenario) => {
      if (scenario.socialIssue?.type) {
        types.add(scenario.socialIssue.type);
      }
    });
    return Array.from(types).sort();
  }, [scenarios]);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter((scenario) => {
      const hay =
        `${scenario.title} ${scenario.description} ${scenario.socialIssue?.type || ''}`.toLowerCase();
      const matchesSearch = hay.includes(searchTerm.toLowerCase());
      const matchesIssueType =
        selectedIssueType === 'all' || scenario.socialIssue?.type === selectedIssueType;
      return matchesSearch && matchesIssueType;
    });
  }, [scenarios, searchTerm, selectedIssueType]);

  const setCardRef = useCallback((id: string, element: HTMLDivElement | null) => {
    cardRefs.current[id] = element;
  }, []);

  const setDescriptionRef = useCallback((id: string, element: HTMLDivElement | null) => {
    descriptionRefs.current[id] = element;
  }, []);

  const setHighlightRef = useCallback((id: string, element: HTMLDivElement | null) => {
    highlightRefs.current[id] = element;
  }, []);

  const equalizePrimaryChallengeByRow = useCallback(() => {
    const ids = filteredScenarios.map((scenario) => scenario.id);
    if (!ids.length) return;

    const BASE_GAP = 12;

    // Reset measurements to natural height 
    ids.forEach((id) => {
      const description = descriptionRefs.current[id];
      const highlight = highlightRefs.current[id];
      if (description) description.style.height = 'auto';
      if (highlight) {
        highlight.style.marginTop = `${BASE_GAP}px`;
        highlight.style.height = 'auto';
      }
    });

    // Group cards by visual rows based on top position
    const rows = new Map<number, string[]>();
    ids.forEach((id) => {
      const card = cardRefs.current[id];
      if (!card) return;
      const top = Math.round(card.getBoundingClientRect().top);
      let rowKey = top;
      for (const existingKey of rows.keys()) {
        if (Math.abs(existingKey - top) <= 2) {
          rowKey = existingKey;
          break;
        }
      }
      const row = rows.get(rowKey) ?? [];
      row.push(id);
      rows.set(rowKey, row);
    });

    // Equalize description height per row
    rows.forEach((rowIds) => {
      let maxDescriptionHeight = 0;
      rowIds.forEach((id) => {
        const description = descriptionRefs.current[id];
        if (!description) return;
        maxDescriptionHeight = Math.max(maxDescriptionHeight, description.getBoundingClientRect().height);
      });

      rowIds.forEach((id) => {
        const description = descriptionRefs.current[id];
        if (description) {
          description.style.height = `${Math.ceil(maxDescriptionHeight)}px`;
        }
      });
    });

    // Align "Primary Challenge" start position per row
    rows.forEach((rowIds) => {
      let targetStart = 0;
      rowIds.forEach((id) => {
        const card = cardRefs.current[id];
        const highlight = highlightRefs.current[id];
        if (!card || !highlight) return;
        const start = highlight.getBoundingClientRect().top - card.getBoundingClientRect().top;
        targetStart = Math.max(targetStart, start);
      });

      rowIds.forEach((id) => {
        const card = cardRefs.current[id];
        const highlight = highlightRefs.current[id];
        if (!card || !highlight) return;
        const start = highlight.getBoundingClientRect().top - card.getBoundingClientRect().top;
        const extra = Math.max(0, Math.ceil(targetStart - start));
        highlight.style.marginTop = `${BASE_GAP + extra}px`;
      });
    });

    rows.forEach((rowIds) => {
      let maxHighlightHeight = 0;
      rowIds.forEach((id) => {
        const highlight = highlightRefs.current[id];
        if (!highlight) return;
        maxHighlightHeight = Math.max(maxHighlightHeight, highlight.getBoundingClientRect().height);
      });

      rowIds.forEach((id) => {
        const highlight = highlightRefs.current[id];
        if (highlight) {
          highlight.style.height = `${Math.ceil(maxHighlightHeight)}px`;
        }
      });
    });
  }, [filteredScenarios]);

  useLayoutEffect(() => {
    if (!filteredScenarios.length) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(equalizePrimaryChallengeByRow);
    };

    schedule();
    window.addEventListener('resize', schedule);

    const observer =
      typeof ResizeObserver !== 'undefined' && gridRef.current
        ? new ResizeObserver(schedule)
        : null;

    if (observer && gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [equalizePrimaryChallengeByRow, filteredScenarios.length]);

  const hasSavedProgress = (scenarioId: string) => savedProgress[scenarioId] ?? false;
  const forceTwoColumns = selectedIssueType !== 'all' && filteredScenarios.length === 1;

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
          <Grid ref={gridRef} $count={filteredScenarios.length || 1} $forceTwoColumns={forceTwoColumns}>
            {filteredScenarios.map((scenario) => {
              const canPlay = canPlayScenario(scenario, userResources);
              const hasProgress = hasSavedProgress(scenario.id);
              const profileImage = getScenarioImage(scenario);

              return (
                <CardMeasureWrap key={scenario.id} ref={(el) => setCardRef(scenario.id, el)}>
                <SCard dim={!canPlay}>
                  {/* Show in-progress badge */}
                  {hasProgress && (
                    <InProgressBadge>
                      <Play size={10} />
                      In Progress
                    </InProgressBadge>
                  )}

                  <SHeader>
                    <TitleRow>
                      <TitleMainRow>
                        <IconBox>
                          <BookOpen className="default-book-icon" aria-hidden />
                          {profileImage && (
                            <AvatarImage
                              src={profileImage}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          )}
                        </IconBox>
                        <div>
                          <STitle>{scenario.title}</STitle>
                          <BadgeRow>
                            {scenario.socialIssue?.type && (
                              <TypeBadge hue={issueHue(scenario.socialIssue.type)}>
                                {toTitleCase(scenario.socialIssue.type)}
                              </TypeBadge>
                            )}
                          </BadgeRow>
                        </div>
                      </TitleMainRow>
                    </TitleRow>
                  </SHeader>

                  <SContent>
                    <SDescription ref={(el) => setDescriptionRef(scenario.id, el)}>
                      {scenario.description}
                    </SDescription>
                    {scenario.socialIssue?.description && (
                      <Highlight ref={(el) => setHighlightRef(scenario.id, el)}>
                        <HighlightTitle>Primary Challenge:</HighlightTitle>
                        <HighlightText>{scenario.socialIssue.description}</HighlightText>
                      </Highlight>
                    )}

                    <MetaRow>
                      <MetaLeft>
                        <Clock width={16} height={16} />
                        {scenario.estimatedDuration || 15} minutes
                      </MetaLeft>
                      <span>{scenario.decisions?.length || 0} decision points</span>
                    </MetaRow>

                    <PrimaryButton
                      onClick={() => onScenarioSelect(scenario)}
                      disabled={!canPlay}
                      $isResume={hasProgress}
                    >
                      {!canPlay ? (
                        'Insufficient Resources'
                      ) : hasProgress ? (
                        <>
                          <Play size={16} />
                          Continue Scenario
                        </>
                      ) : (
                        'Begin Scenario'
                      )}
                    </PrimaryButton>
                  </SContent>
                </SCard>
                </CardMeasureWrap>
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
