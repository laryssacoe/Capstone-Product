"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Button as UIButton } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card as UICard, CardContent as UICardContent } from "@/components/ui/card";
import { 
  User, 
  DollarSign, 
  Clock, 
  Heart, 
  X,
  MapPin,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Play,
  AlertCircle
} from "lucide-react";
import type { Avatar } from "@/types/simulation";

type AvatarWithMetrics = Avatar & {
  storyId?: string | null;
  storyTitle?: string | null;
  storySummary?: string | null;
  metrics?: {
    clicks: number;
    starts: number;
    score: number;
    rank?: number | null;
  };
};

const gradForAvatar = (id: string) => {
  switch (id) {
    case "maria-rodriguez": return "linear-gradient(135deg, #ec4899, #f43f5e)";
    case "sam-thompson": return "linear-gradient(135deg, #6366f1, #3b82f6)";
    case "aisha-johnson": return "linear-gradient(135deg, #8b5cf6, #a78bfa)";
    case "ana-wheelchair": return "linear-gradient(135deg, #8b5cf6, #c084fc)";
    case "katrina-mahinay": return "linear-gradient(135deg, #8b5cf6, #c084fc)";
    default: return "linear-gradient(135deg, #6366f1, #8b5cf6)";
  }
};

// Get avatar profile image, only return valid image paths
const getAvatarImage = (avatar: AvatarWithMetrics): string => {
  const imagePath = (avatar.appearance as any)?.image || (avatar as any).image || "";
  
  // Only trust image paths in /scenes/ directory 
  if (imagePath && imagePath.startsWith("/scenes/")) {
    return imagePath;
  }
  
  // Return empty string for invalid/placeholder paths to show icon fallback
  return "";
};

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Page = styled.div`
  min-height: 100vh;
  color: #e2e8f0;
  background: 
    radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15), transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(59, 130, 246, 0.1), transparent 50%),
    #0a0f1a;
`;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 3rem 1.5rem 4rem;
  max-width: 80rem;
  margin: 0 auto;
`;

const Hero = styled.header`
  text-align: center;
  margin: 0 auto 3.5rem;
  max-width: 42rem;
  animation: ${fadeIn} 0.6s ease-out;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 800;
  margin: 0 0 0.75rem;
  color: #f8fafc;
  letter-spacing: -0.02em;
`;

const GradientText = styled.span`
  background: linear-gradient(135deg, #a78bfa, #60a5fa, #c084fc);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${shimmer} 3s linear infinite;
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 1.1rem;
  line-height: 1.7;
  margin: 0;
`;

const Notice = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(251, 191, 36, 0.25);
  background: rgba(251, 191, 36, 0.08);
  font-size: 0.875rem;
  color: #fcd34d;
  
  svg {
    flex-shrink: 0;
  }
`;

const CardsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  width: 100%;
  animation: ${fadeIn} 0.6s ease-out 0.2s both;
`;

const CardWrapper = styled.div`
  width: 100%;
  max-width: 360px;
  
  @media (min-width: 768px) {
    width: calc(50% - 0.75rem);
    max-width: 380px;
  }
  
  @media (min-width: 1024px) {
    width: calc(33.333% - 1rem);
    max-width: 380px;
  }
`;

const StoryCard = styled(UICard)<{ $isPlayable?: boolean }>`
  height: 100%;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(71, 85, 105, 0.4);
  border-radius: 1.25rem;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: ${({ $isPlayable }) => ($isPlayable ? "pointer" : "default")};
  opacity: ${({ $isPlayable }) => ($isPlayable ? 1 : 0.5)};
  position: relative;

  ${({ $isPlayable }) =>
    $isPlayable &&
    `
    &:hover {
      transform: translateY(-6px);
      border-color: rgba(139, 92, 246, 0.5);
      box-shadow: 
        0 20px 40px -15px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(139, 92, 246, 0.1);
    }
    
    &:hover .avatar-glow {
      opacity: 1;
    }
  `}
`;

const AvatarGlow = styled.div`
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
`;

const CardInner = styled(UICardContent)`
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const AvatarSection = styled.div`
  text-align: center;
  margin-bottom: 1.25rem;
`;

const AvatarCircle = styled.div<{ $grad: string }>`
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $grad }) => $grad};
  box-shadow: 
    0 8px 24px -8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }
  
  svg {
    width: 36px;
    height: 36px;
    color: #fff;
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
`;

const CharacterName = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 0.25rem;
`;

const CharacterMeta = styled.p`
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(71, 85, 105, 0.5), transparent);
  margin: 1rem 0;
`;

const BackgroundText = styled.p`
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.65;
  margin: 0 0 1.25rem;
  flex: 1;
`;

const ChallengeBox = styled.div`
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 0.75rem;
  padding: 0.875rem 1rem;
  margin-bottom: 1rem;
`;

const ChallengeLabel = styled.p`
  color: #f87171;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 0.375rem;
`;

const ChallengeValue = styled.p`
  color: #fca5a5;
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  text-transform: capitalize;
`;

const InfoGrid = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(71, 85, 105, 0.25);
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.8rem;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const InfoValue = styled.span`
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 500;
`;

const ComingSoonOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1.25rem;
`;

const ComingSoonBadge = styled.div`
  background: rgba(71, 85, 105, 0.8);
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border-radius: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SavedProgressBadge = styled.div`
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

const BackRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 3rem;
  animation: ${fadeIn} 0.6s ease-out 0.4s both;
`;

const BackBtn = styled(UIButton)`
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.4);
  border-radius: 0.75rem;
  color: #94a3b8;
  padding: 0.625rem 1.25rem;
  font-size: 0.9rem;
  
  &:hover {
    background: rgba(51, 65, 85, 0.6);
    color: #e2e8f0;
    border-color: rgba(100, 116, 139, 0.5);
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: #64748b;
  font-size: 0.95rem;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem 1.5rem;
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 1rem;
  max-width: 28rem;
  margin: 0 auto;
  font-size: 0.9rem;
`;

/* Modal Styles */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(10, 15, 26, 0.9);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
  position: relative;
`;

const ModalCloseBtn = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(51, 65, 85, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 0.5rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(71, 85, 105, 0.5);
    color: #e2e8f0;
  }
`;

const ModalAvatar = styled.div<{ $grad: string }>`
  width: 72px;
  height: 72px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $grad }) => $grad};
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  
  svg {
    width: 32px;
    height: 32px;
    color: #fff;
  }
`;

const ModalAvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
`;

const ModalName = styled.h2`
  font-size: 1.375rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 0.25rem;
`;

const ModalMeta = styled.p`
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ModalSection = styled.div``;

const ModalSectionTitle = styled.h4`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  margin: 0 0 0.625rem;
`;

const ModalText = styled.p`
  color: #cbd5e1;
  font-size: 0.925rem;
  line-height: 1.65;
  margin: 0;
`;

const ModalChallengeBox = styled.div`
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
`;

const ModalChallengeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const ModalChallengeBadge = styled(UIBadge)`
  background: rgba(139, 92, 246, 0.2);
  color: #c4b5fd;
  border: none;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
`;

const ModalSeverityBadge = styled(UIBadge)`
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: none;
  font-size: 0.7rem;
`;

const ModalChallengeDesc = styled.p`
  color: #94a3b8;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
`;

const ResourcesRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
`;

const ResourceBox = styled.div`
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 0.625rem;
  padding: 0.75rem;
  text-align: center;
`;

const ResourceIcon = styled.div<{ $color: string }>`
  color: ${({ $color }) => $color};
  margin-bottom: 0.375rem;
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ResourceValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #e2e8f0;
`;

const ResourceLabel = styled.div`
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-top: 0.125rem;
`;

const SavedProgressInfo = styled.div`
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 0.75rem;
  padding: 0.875rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SavedProgressIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 50%;
  color: #4ade80;
  flex-shrink: 0;
`;

const SavedProgressText = styled.div`
  flex: 1;
`;

const SavedProgressTitle = styled.div`
  color: #4ade80;
  font-size: 0.85rem;
  font-weight: 600;
`;

const SavedProgressDesc = styled.div`
  color: #94a3b8;
  font-size: 0.75rem;
  margin-top: 0.125rem;
`;

const ModalFooter = styled.div`
  padding: 0 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
`;

const StartBtn = styled(UIButton)<{ $grad: string }>`
  flex: 1;
  background: ${({ $grad }) => $grad};
  border: none;
  color: #fff;
  font-weight: 600;
  padding: 0.875rem 1.25rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;

const CancelBtn = styled(UIButton)`
  background: rgba(51, 65, 85, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.5);
  color: #94a3b8;
  padding: 0.875rem 1.25rem;
  border-radius: 0.75rem;
  
  &:hover {
    background: rgba(71, 85, 105, 0.5);
    color: #e2e8f0;
  }
`;

export default function AvatarPage() {
  const router = useRouter();
  const [avatars, setAvatars] = useState<AvatarWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarWithMetrics | null>(null);
  const [savedProgress, setSavedProgress] = useState<Record<string, boolean>>({});

  const handleStart = (avatar: AvatarWithMetrics) => {
    const storySlug = avatar.storySlug || avatar.id;
    localStorage.removeItem("selectedAvatar");
    localStorage.setItem("selectedAvatarId", avatar.id);
    router.push(`/simulation?story=${encodeURIComponent(storySlug)}`);
  };

  // Check for saved progress for each avatar
  useEffect(() => {
    async function checkSavedProgress() {
      if (typeof window === "undefined") return;
      
      const sessionId = localStorage.getItem("loop_session_id");
      if (!sessionId) return;

      const progressMap: Record<string, boolean> = {};
      
      for (const avatar of avatars) {
        const storySlug = avatar.storySlug || avatar.id;
        try {
          const res = await fetch(
            `/api/saves?storySlug=${encodeURIComponent(storySlug)}&sessionId=${encodeURIComponent(sessionId)}`
          );
          if (res.ok) {
            const data = await res.json();
            // Check if there's a save that's not at the start
            const hasMeaningfulProgress = data.saves?.some(
              (save: any) => save.currentPassageId && save.currentPassageId !== "start"
            );
            if (hasMeaningfulProgress) {
              progressMap[avatar.id] = true;
            }
          }
        } catch (e) {
          // Ignore errors for individual saves
        }
      }
      
      setSavedProgress(progressMap);
    }

    if (avatars.length > 0) {
      checkSavedProgress();
    }
  }, [avatars]);

  useEffect(() => {
    let active = true;
    
    async function loadAvatars() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch("/api/avatars?featured=3&limit=6", { cache: "no-store" });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Unable to load stories.");
        }
        
        const data = await response.json();
        
        if (active) {
          setAvatars((data.avatars ?? []) as AvatarWithMetrics[]);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load stories.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAvatars();
    
    return () => {
      active = false;
    };
  }, []);

  const hasSavedProgress = (avatarId: string) => savedProgress[avatarId] ?? false;

  return (
    <Page>
      <Container>
        <Hero>
          <Title>
            Choose Your <GradientText>Story</GradientText>
          </Title>
          <Subtitle>
            Experience the daily realities and challenges faced by others. 
            Make choices, face consequences, and build understanding.
          </Subtitle>
          <Notice>
            <AlertCircle size={16} />
            The stories included here are simulations inspired by real social issues
          </Notice>
        </Hero>

        {loading ? (
          <LoadingState>Finding available stories...</LoadingState>
        ) : error ? (
          <ErrorState>{error}</ErrorState>
        ) : (
          <CardsGrid>
            {avatars.map((avatar) => {
              const isPlayable = !!avatar.isPlayable;
              const primaryIssue = avatar.socialContext?.socialIssues?.[0];
              const challengeType = primaryIssue?.type?.replace(/-/g, " ") || "Life challenges";
              const avatarImage = getAvatarImage(avatar);
              const hasProgress = hasSavedProgress(avatar.id);

              return (
                <CardWrapper key={avatar.id}>
                  <StoryCard
                    $isPlayable={isPlayable}
                    onClick={isPlayable ? () => setSelectedAvatar(avatar) : undefined}
                  >
                    <AvatarGlow className="avatar-glow" />
                    
                    {/* Show saved progress badge */}
                    {isPlayable && hasProgress && (
                      <SavedProgressBadge>
                        <Play size={10} />
                        In Progress
                      </SavedProgressBadge>
                    )}
                    
                    <CardInner>
                      <AvatarSection>
                        <AvatarCircle $grad={gradForAvatar(avatar.id)}>
                          {avatarImage ? (
                            <AvatarImage src={avatarImage} alt={avatar.name} />
                          ) : (
                            <User />
                          )}
                        </AvatarCircle>
                        <CharacterName>{avatar.name}</CharacterName>
                        <CharacterMeta>Age {avatar.age}</CharacterMeta>
                      </AvatarSection>

                      <Divider />

                      <BackgroundText>
                        {isPlayable ? avatar.background : "This story is still being developed. Check back soon."}
                      </BackgroundText>

                      {isPlayable && (
                        <>
                          <ChallengeBox>
                            <ChallengeLabel>Primary Challenge</ChallengeLabel>
                            <ChallengeValue>{challengeType}</ChallengeValue>
                          </ChallengeBox>

                          <InfoGrid>
                            <InfoItem>
                              <InfoLabel><MapPin /> Location</InfoLabel>
                              <InfoValue>{avatar.socialContext?.location || "—"}</InfoValue>
                            </InfoItem>
                            <InfoItem>
                              <InfoLabel><Briefcase /> Work</InfoLabel>
                              <InfoValue>{avatar.socialContext?.employmentStatus || "—"}</InfoValue>
                            </InfoItem>
                            <InfoItem>
                              <InfoLabel><GraduationCap /> Education</InfoLabel>
                              <InfoValue>{avatar.socialContext?.educationLevel || "—"}</InfoValue>
                            </InfoItem>
                          </InfoGrid>
                        </>
                      )}
                    </CardInner>

                    {!isPlayable && (
                      <ComingSoonOverlay>
                        <ComingSoonBadge>Coming Soon</ComingSoonBadge>
                      </ComingSoonOverlay>
                    )}
                  </StoryCard>
                </CardWrapper>
              );
            })}
          </CardsGrid>
        )}

        <BackRow>
          <BackBtn onClick={() => router.push("/")}>
            ← Back to Home
          </BackBtn>
        </BackRow>
      </Container>

      {/* Detail Modal */}
      {selectedAvatar && (
        <ModalOverlay onClick={() => setSelectedAvatar(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalCloseBtn onClick={() => setSelectedAvatar(null)}>
                <X size={16} />
              </ModalCloseBtn>
              <ModalAvatar $grad={gradForAvatar(selectedAvatar.id)}>
                {getAvatarImage(selectedAvatar) ? (
                  <ModalAvatarImage
                    src={getAvatarImage(selectedAvatar)}
                    alt={selectedAvatar.name}
                  />
                ) : (
                  <User />
                )}
              </ModalAvatar>
              <ModalName>{selectedAvatar.name}</ModalName>
              <ModalMeta>Age {selectedAvatar.age} • {selectedAvatar.socialContext?.location}</ModalMeta>
            </ModalHeader>

            <ModalBody>
              {/* Show saved progress notice if exists */}
              {hasSavedProgress(selectedAvatar.id) && (
                <SavedProgressInfo>
                  <SavedProgressIcon>
                    <Play size={16} />
                  </SavedProgressIcon>
                  <SavedProgressText>
                    <SavedProgressTitle>Progress Saved</SavedProgressTitle>
                    <SavedProgressDesc>You have saved progress in this story. You&apos;ll continue where you left off.</SavedProgressDesc>
                  </SavedProgressText>
                </SavedProgressInfo>
              )}

              <ModalSection>
                <ModalSectionTitle>Background</ModalSectionTitle>
                <ModalText>{selectedAvatar.background}</ModalText>
              </ModalSection>

              {selectedAvatar.socialContext?.socialIssues?.[0] && (
                <ModalSection>
                  <ModalSectionTitle>Primary Challenge</ModalSectionTitle>
                  <ModalChallengeBox>
                    <ModalChallengeHeader>
                      <ModalChallengeBadge>
                        {selectedAvatar.socialContext.socialIssues[0].type.replace(/-/g, " ")}
                      </ModalChallengeBadge>
                      <ModalSeverityBadge>
                        {selectedAvatar.socialContext.socialIssues[0].severity}
                      </ModalSeverityBadge>
                    </ModalChallengeHeader>
                    <ModalChallengeDesc>
                      {selectedAvatar.socialContext.socialIssues[0].description}
                    </ModalChallengeDesc>
                  </ModalChallengeBox>
                </ModalSection>
              )}

              <ModalSection>
                <ModalSectionTitle>Starting Resources</ModalSectionTitle>
                <ResourcesRow>
                  <ResourceBox>
                    <ResourceIcon $color="#4ade80">
                      <DollarSign />
                    </ResourceIcon>
                    <ResourceValue>${selectedAvatar.initialResources?.money ?? 500}</ResourceValue>
                    <ResourceLabel>Money</ResourceLabel>
                  </ResourceBox>
                  <ResourceBox>
                    <ResourceIcon $color="#f87171">
                      <Heart />
                    </ResourceIcon>
                    <ResourceValue>
                      {selectedAvatar.initialResources?.physicalHealth ?? 
                       selectedAvatar.initialResources?.mentalHealth ?? 100}%
                    </ResourceValue>
                    <ResourceLabel>Health</ResourceLabel>
                  </ResourceBox>
                  <ResourceBox>
                    <ResourceIcon $color="#60a5fa">
                      <Clock />
                    </ResourceIcon>
                    <ResourceValue>~15</ResourceValue>
                    <ResourceLabel>Minutes</ResourceLabel>
                  </ResourceBox>
                </ResourcesRow>
              </ModalSection>
            </ModalBody>

            <ModalFooter>
              <CancelBtn onClick={() => setSelectedAvatar(null)}>
                Back
              </CancelBtn>
              <StartBtn 
                $grad={gradForAvatar(selectedAvatar.id)}
                onClick={() => handleStart(selectedAvatar)}
              >
                {hasSavedProgress(selectedAvatar.id) ? (
                  <>
                    Continue Journey
                    <Play size={18} />
                  </>
                ) : (
                  <>
                    Begin Journey
                    <ArrowRight size={18} />
                  </>
                )}
              </StartBtn>
            </ModalFooter>
          </ModalCard>
        </ModalOverlay>
      )}
    </Page>
  );
}