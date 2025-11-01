"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { Button as UIButton } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Progress as UIProgress } from "@/components/ui/progress";
import { Card as UICard, CardContent as UICardContent } from "@/components/ui/card";
import { User, DollarSign, Clock, Zap, Users, Brain, Activity } from "lucide-react";
import type { Avatar, Resources } from "@/types/simulation";

const gradForAvatar = (id: string) => {
  switch (id) {
    case "maria-rodriguez": return "linear-gradient(135deg,#f43f5e,#ec4899)";
    case "sam-thompson":  return "linear-gradient(135deg,#3b82f6,#6366f1)";
    case "aisha-johnson":   return "linear-gradient(135deg,#8b5cf6,#7c3aed)";
    default:                return "linear-gradient(135deg,#64748b,#334155)";
  }
};
const valueColor = (v: number) => (v >= 70 ? "#22c55e" : v >= 40 ? "#eab308" : "#ef4444");

const getResourceIcon = (type: keyof Resources) => {
  const s = 16;
  switch (type) {
    case "money": return <DollarSign size={s} />;
    case "time": return <Clock size={s} />;
    case "energy": return <Zap size={s} />;
    case "socialSupport": return <Users size={s} />;
    case "mentalHealth": return <Brain size={s} />;
    case "physicalHealth": return <Activity size={s} />;
  }
};
const getResourceLabel = (type: keyof Resources) => ({
  money: "Financial Resources",
  time: "Available Time",
  energy: "Energy Level",
  socialSupport: "Social Support",
  mentalHealth: "Mental Health",
  physicalHealth: "Physical Health",
}[type]);

type InteractionKind = "VIEW" | "SELECT" | "START";

type AvatarWithMetrics = Avatar & {
  storyId?: string | null;
  metrics?: {
    clicks: number;
    starts: number;
    score: number;
    rank?: number | null;
  };
};

const Page = styled.div`
  min-height: 100vh;
  color: #e2e8f0;
  background: radial-gradient(120% 120% at 10% -20%, rgba(59,130,246,.10), transparent 60%),
              #0f172a;
`;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 3rem 1rem;
  max-width: 72rem;
  margin: 0 auto;
`;

const Hero = styled.header`
  text-align: center;
  margin: 0 auto 3.5rem;
  max-width: 60rem;
`;
const Title = styled.h1`
  font-size: clamp(2.25rem, 3.5vw, 3.5rem);
  font-weight: 800;
  margin: 0 0 1rem;
  color: #f1f5f9;
  line-height: 1.2;
`;
const GradientWord = styled.span`
  display: block;
  background: linear-gradient(90deg,#60a5fa,#c084fc,#93c5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;
const Underline = styled.div`
  width: 5rem; height: 4px; margin: 0.5rem auto 1rem;
  background: linear-gradient(90deg,#3b82f6,#7c3aed);
  border-radius: 999px;
`;
const Lead = styled.p`
  color: #94a3b8; line-height: 1.8; margin: 0 auto; max-width: 48rem;
`;
const Notice = styled.div`
  margin-top: 1.25rem; padding: 0.9rem 1rem; border-radius: .75rem;
  border: 1px solid rgba(180, 83, 9, .35);
  color: ##a75050; background: linear-gradient(90deg, rgba(146,64,14,.18), rgba(194,65,12,.16));
  backdrop-filter: blur(4px);
  font-size: .9rem; font-weight: 600;
`;

const CardsGrid = styled.div`
  display: grid; gap: 2rem; flex: 1 0 auto;
  grid-template-columns: repeat(1, minmax(0,1fr));
  @media (min-width: 1024px){ grid-template-columns: repeat(3, minmax(0,1fr)); }
`;

const Card = styled(UICard)`
  border: 1px solid rgba(71,85,105,.45);
  background:
    radial-gradient(120% 140% at 10% -20%, rgba(59,130,246,.10), transparent 55%),
    rgba(2,6,23,.75);
  border-radius: 1.25rem;
  box-shadow: 0 16px 36px rgba(2,6,23,.55);
  transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
  &:hover{ transform: translateY(-2px); border-color: rgba(148,163,184,.6); box-shadow: 0 20px 44px rgba(2,6,23,.6); }
  cursor: pointer;
`;
const CardInner = styled(UICardContent)`
  padding: 2rem;
`;
const AvatarCircle = styled.div<{ $grad: string }>`
  width: 96px; height: 96px; margin: 0 auto 1rem; border-radius: 9999px;
  display: grid; place-items: center; background: ${({ $grad }) => $grad};
  box-shadow: 0 10px 24px rgba(0,0,0,.35);
  svg { width: 48px; height: 48px; color: #fff; }
`;
const Name = styled.h3`
  font-size: 1.375rem; font-weight: 700; color: #f8fafc; margin: 0 0 .25rem; text-align: center;
`;
const Age = styled.p` color: #94a3b8; text-align: center; margin: 0 0 .75rem; `;
const BackgroundText = styled.p`
  color: #cbd5e1; text-align: center; line-height: 1.7; font-size: .95rem; margin: 0 0 1.25rem;
`;
const PrimaryBox = styled.div`
  border: 1px solid rgba(127,29,29,.35);
  background: linear-gradient(180deg, rgba(127,29,29,.28), rgba(71,13,13,.25));
  border-radius: .85rem; padding: 1rem; margin-bottom: 1.25rem;
`;
const PrimaryLabel = styled.p`
  color: #fca5a5; letter-spacing: .12em; text-transform: uppercase; font-weight: 700;
  font-size: .7rem; margin: 0 0 .4rem;
`;
const PrimaryType = styled.p`
  color: #fecaca; font-weight: 700; margin: 0; font-size: 1rem;
`;

/* aligned info */
const InfoList = styled.div` display: grid; row-gap: 8px; `;
const InfoRow = styled.div`
  display: grid; grid-template-columns: 140px 1fr; align-items: center;
  padding: 6px 0; border-bottom: 1px solid rgba(100,116,139,.35);
  &:last-child{ border-bottom: none; }
`;
const InfoLabel = styled.span` color: #94a3b8; font-weight: 600; `;
const InfoValue = styled.span`
  color: #e5e7eb; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;

const BackRow = styled.div` display: flex; justify-content: center; padding: 0 0 2rem; `;
const BackBtn = styled(UIButton)`
  background: rgba(30,41,59,.6);
  margin: 40px 0 0; border-radius: .75rem;  
  color: #cbd5e1;
  border: 1px solid rgba(100,116,139,.4);
  padding: .55rem 1.1rem;
  &:hover{ background: rgba(30,41,59,.8); color:#fff; border-color: rgba(148,163,184,.6); }
`;

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
  padding: 1rem; background: rgba(2,6,23,.85); backdrop-filter: blur(6px);
`;
const ModalCard = styled(UICard)`
  width: 100%; max-width: 720px; max-height: 90vh; overflow: hidden;
  border-color: rgba(71,85,105,.6);
  background:
    radial-gradient(120% 140% at 10% -20%, rgba(59,130,246,.10), transparent 55%),
    linear-gradient(180deg, rgba(15,23,42,.96), rgba(2,6,23,.98));
  color: #e2e8f0; box-shadow: 0 14px 34px rgba(2,6,23,.55);
`;
const ModalContent = styled(UICardContent)` padding: 1.25rem 1.25rem 1.5rem; overflow-y: auto; `;
const HeaderRow = styled.div` display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; `;
const PersonRow = styled.div` display: flex; align-items: center; gap: 1rem; `;
const HeadName = styled.h2` margin: 0; font-weight: 800; font-size: 1.35rem; color: #f1f5f9; `;
const Subtle = styled.p` margin: .2rem 0 0; color: #94a3b8; `;
const CloseBtn = styled(UIButton)`
  background: transparent; border: 1px solid rgba(148,163,184,.28);
  color: #94a3b8; padding: .25rem .55rem;
  &:hover { background: rgba(30,41,59,.55); color: #e2e8f0; }
`;
const Section = styled.section` display: grid; gap: .5rem; `;
const SectionTitle = styled.h3` margin: 0 0 .25rem; font-weight: 700; font-size: 1.05rem; color: #e2e8f0; `;
const BodyText = styled.p` margin: 0; color: #cbd5e1; line-height: 1.7; `;
const ResourcesGrid = styled.div`
  display: grid; gap: .9rem; grid-template-columns: repeat(2, minmax(0,1fr));
  @media (max-width: 560px){ grid-template-columns: 1fr; }
`;
const Resource = styled.div` display: grid; gap: .35rem; `;
const ResourceTop = styled.div` display: grid; grid-template-columns: 1fr auto; align-items: center; `;
const ResourceLeft = styled.div` display: inline-flex; align-items: center; gap: .5rem; color: #cbd5e1; `;
const ResourceVal = styled.span<{ $v: number }>` font-weight: 800; color: ${({ $v }) => valueColor($v)}; `;
const Bar = styled(UIProgress)`
  height: 8px; border-radius: 9999px; background: #334155;
  & > div { background: #f59e0b; }
`;
const ChallengeCard = styled.div`
  background: rgba(30,41,59,.55);
  border: 1px solid rgba(71,85,105,.55);
  border-radius: .75rem; padding: 1rem;
`;
const Chip = styled(UIBadge)`
  font-size: .72rem; color: #c7d2fe; background: rgba(67,56,202,.22);
  border: 1px solid rgba(148,163,184,.35);
`;
const Severity = styled(UIBadge)`
  font-size: .72rem; color: #bfdbfe; background: rgba(59,130,246,.18);
  border: 1px solid rgba(148,163,184,.35);
`;
const Footer = styled.div` display: flex; gap: .75rem; padding-top: .75rem; `;
const PrimaryBtn = styled(UIButton)<{ $grad: string }>`
  flex: 1; color: #f8fafc; border: none; background: ${({ $grad }) => $grad};
  box-shadow: 0 8px 20px rgba(88,80,236,.25); &:hover{ filter: brightness(1.05); }
`;
const SecondaryBtn = styled(UIButton)`
  border: 1px solid rgba(148,163,184,.32); color: #cbd5e1; background: transparent;
  &:hover { background: rgba(30,41,59,.6); color: #e2e8f0; }
`;

export default function AvatarPage() {
  const router = useRouter();
  const [avatars, setAvatars] = useState<AvatarWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarWithMetrics | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const recordInteraction = useCallback(
    async (
      avatarId: string,
      kind: InteractionKind,
      options?: { storyId?: string | null; metadata?: Record<string, unknown> },
    ) => {
      try {
        const response = await fetch("/api/analytics/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatarId,
            storyId: options?.storyId ?? undefined,
            kind,
            metadata: options?.metadata,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }
      } catch (err) {
        console.warn("[avatar] Unable to record interaction", err);
      }
    },
    [],
  );

  const recordImpressions = useCallback(
    (items: AvatarWithMetrics[]) => {
      items.forEach((avatar) => {
        void recordInteraction(avatar.id, "VIEW", {
          storyId: avatar.storyId ?? null,
          metadata: {
            rank: avatar.metrics?.rank ?? null,
          },
        });
      });
    },
    [recordInteraction],
  );

  const handleAvatarSelect = (avatar: AvatarWithMetrics) => {
    void recordInteraction(avatar.id, "START", {
      storyId: avatar.storyId ?? null,
      metadata: {
        rank: avatar.metrics?.rank ?? null,
      },
    });
    localStorage.removeItem("selectedAvatar");
    localStorage.setItem("selectedAvatarId", avatar.id);
    router.push("/simulation");
  };

  useEffect(() => {
    let active = true;
    async function loadAvatars() {
      setLoading(true);
      setError(null);
      try {
  const response = await fetch("/api/avatars?featured=3&limit=3", { cache: "no-store" });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Unable to load avatars.");
        }
        const data = await response.json();
        if (active) {
          const nextAvatars = (data.avatars ?? []) as AvatarWithMetrics[];
          setAvatars(nextAvatars);
          recordImpressions(nextAvatars);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load avatars.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAvatars();
    return () => {
      active = false;
    };
  }, [recordImpressions]);

  return (
    <Page>
      <Container>
        <Hero>
          <Title>
            Choose Your
            <GradientWord>Story</GradientWord>
          </Title>
          <Underline />
          <Lead>
            Experience the daily struggles and systemic barriers faced by real people in our society.
          </Lead>
          <Notice>
            These simulations address real social issues including discrimination and systemic inequality.
          </Notice>
        </Hero>

        {loading ? (
          <Notice style={{ marginTop: "2rem", textAlign: "center" }}>Loading avatars…</Notice>
        ) : error ? (
          <Notice
            style={{
              marginTop: "2rem",
              textAlign: "center",
              borderColor: "rgba(239,68,68,.4)",
              color: "#fecaca",
            }}
          >
            {error}
          </Notice>
        ) : (
          <CardsGrid>
            {avatars.map((avatar, index) => {
              const isPlayable = !!avatar.isPlayable;
              const rank = avatar.metrics?.rank ?? index + 1;
              const clicks = avatar.metrics?.clicks ?? 0;
              const starts = avatar.metrics?.starts ?? 0;
              const storyId = avatar.storyId ?? null;
              const primaryType = isPlayable
                ? avatar.socialContext.socialIssues[0]?.type.replace("-", " ").toUpperCase()
                : "COMING SOON";
              const displayBackground = isPlayable ? avatar.background : "Details coming soon.";
              const displayLocation = isPlayable ? avatar.socialContext.location : "—";
              const displayEmployment = isPlayable ? avatar.socialContext.employmentStatus : "—";
              const displayEducation = isPlayable ? avatar.socialContext.educationLevel : "—";

              return (
                <Card
                  key={avatar.id}
                  onClick={
                    isPlayable
                      ? () => {
                          void recordInteraction(avatar.id, "SELECT", {
                            storyId,
                            metadata: { rank },
                          });
                          setSelectedAvatar(avatar);
                          setShowDetails(true);
                        }
                      : undefined
                  }
                  style={!isPlayable ? { pointerEvents: "none", opacity: 0.6, cursor: "not-allowed" } : undefined}
                >
                  <CardInner>
                    <AvatarCircle $grad={gradForAvatar(avatar.id)}>
                      <User size={48} color="#ffffff" />
                    </AvatarCircle>
                    <Name>{avatar.name}</Name>
                    <Age>Age {avatar.age}</Age>
                    <BackgroundText>{displayBackground}</BackgroundText>

                    <PrimaryBox>
                      <PrimaryLabel>Primary Challenge</PrimaryLabel>
                      <PrimaryType>{primaryType}</PrimaryType>
                    </PrimaryBox>

                    <InfoList>
                      <InfoRow>
                        <InfoLabel>Location</InfoLabel>
                        <InfoValue>{displayLocation}</InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Employment</InfoLabel>
                        <InfoValue>{displayEmployment}</InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Education</InfoLabel>
                        <InfoValue>{displayEducation}</InfoValue>
                      </InfoRow>
                    </InfoList>
                  </CardInner>
                </Card>
              );
            })}
          </CardsGrid>
        )}

        <BackRow>
          <BackBtn onClick={() => router.push("/")}>← Back to Home</BackBtn>
        </BackRow>
      </Container>

      {selectedAvatar && showDetails && (
        <Overlay>
          <ModalCard>
            <ModalContent>
              <HeaderRow>
                <PersonRow>
                  <AvatarCircle $grad={gradForAvatar(selectedAvatar.id)} style={{ margin: 0, width: 64, height: 64 }}>
                    <User size={32} color="#ffffff" />
                  </AvatarCircle>
                  <div>
                    <HeadName>{selectedAvatar.name}</HeadName>
                    <Subtle>Age {selectedAvatar.age}</Subtle>
                  </div>
                </PersonRow>
                <CloseBtn variant="ghost" size="sm" onClick={() => setShowDetails(false)}>✕</CloseBtn>
              </HeaderRow>

              <Section style={{ marginBottom: "1rem" }}>
                <SectionTitle>Background</SectionTitle>
                <BodyText>{selectedAvatar.background}</BodyText>
              </Section>

              <Section>
                <SectionTitle>Starting Resources</SectionTitle>
                <ResourcesGrid>
                  {Object.entries(selectedAvatar.initialResources).map(([key, value]) => (
                    <Resource key={key}>
                      <ResourceTop>
                        <ResourceLeft>
                          {getResourceIcon(key as keyof Resources)}
                          <span style={{ fontSize: ".95rem" }}>{getResourceLabel(key as keyof Resources)}</span>
                        </ResourceLeft>
                        <ResourceVal $v={value}>{value}%</ResourceVal>
                      </ResourceTop>
                      <Bar value={value} />
                    </Resource>
                  ))}
                </ResourcesGrid>
              </Section>

              <Section style={{ marginTop: "1rem" }}>
                <SectionTitle>Primary Challenge</SectionTitle>
                {selectedAvatar.socialContext.socialIssues.map((issue) => (
                  <ChallengeCard key={issue.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
                      <Chip>{issue.type.replace("-", " ")}</Chip>
                      <Severity>{issue.severity}</Severity>
                    </div>
                    <BodyText style={{ fontSize: ".95rem" }}>{issue.description}</BodyText>
                  </ChallengeCard>
                ))}
              </Section>

              <Footer>
                <PrimaryBtn
                  $grad={gradForAvatar(selectedAvatar.id)}
                  size="lg"
                  onClick={() => handleAvatarSelect(selectedAvatar)}
                >
                  Begin Journey as {selectedAvatar.name}
                </PrimaryBtn>
                <SecondaryBtn variant="outline" onClick={() => setShowDetails(false)}>
                  Back to Selection
                </SecondaryBtn>
              </Footer>
            </ModalContent>
          </ModalCard>
        </Overlay>
      )}
    </Page>
  );
}
