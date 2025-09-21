"use client";

import { useState } from "react";
import styled from "styled-components";
import {
  Card as SCard,
  CardContent as SCardContent,
  CardDescription as SCardDescription,
  CardHeader as SCardHeader,
  CardTitle as SCardTitle,
} from "@/components/ui/card";
import { Button as SButton } from "@/components/ui/button";
import { Badge as SBadge } from "@/components/ui/badge";
import {
  Avatar as SAvatar,
  AvatarFallback as SAvatarFallback,
  AvatarImage as SAvatarImage,
} from "@/components/ui/avatar";
import { Separator as SSeparator } from "@/components/ui/separator";
import { Progress as SProgress } from "@/components/ui/progress";
import type { Avatar, Resources } from "@/types/simulation";
import { User, DollarSign, Clock, Zap, Users, Brain, Activity } from "lucide-react";

const Page = styled.div`
  max-width: 96rem;
  margin: 0 auto;
  padding: 1.5rem;
  color: #e2e8f0; /* slate-200 */
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const H2 = styled.h2`
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  font-weight: 800;
  margin: 0 0 0.6rem;
  color: #f1f5f9; /* slate-100 */
`;

const Lead = styled.p`
  margin: 0 auto;
  max-width: 40rem;
  color: #94a3b8; /* slate-400 */
  line-height: 1.75;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.25rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(SCard)<{ $selected?: boolean }>`
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.65), rgba(15, 23, 42, 0.7));
  border-color: rgba(51, 65, 85, 0.6); /* slate-600 */
  backdrop-filter: blur(8px);
  transition: box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease;
  box-shadow: 0 6px 18px rgba(2, 6, 23, 0.25);

  ${({ $selected }) =>
    $selected
      ? `border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96,165,250,.45) inset, 0 10px 22px rgba(2,6,23,.35);`
      : `&:hover { border-color: rgba(148,163,184,.7); transform: translateY(-1px);} `}
`;

const CardHeader = styled(SCardHeader)`
  padding-bottom: 0.6rem;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Avatar = styled(SAvatar)`
  width: 48px;
  height: 48px;
`;

const AvatarImage = styled(SAvatarImage)``;
const AvatarFallback = styled(SAvatarFallback)`
  display: grid;
  place-items: center;
`;

const CardTitle = styled(SCardTitle)`
  font-size: 1.05rem;
  color: #e5e7eb; /* zinc-200 */
  margin: 0;
`;

const Muted = styled.p`
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
`;

const CardContent = styled(SCardContent)`
  display: grid;
  grid-template-rows: auto 1fr auto; /* keeps heights consistent */
  gap: 0.75rem;
`;

const CardDesc = styled(SCardDescription)`
  color: #a5b4fc; /* indigo-300 tint for variety */
  font-size: 0.9rem;
  line-height: 1.5;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const Chip = styled(SBadge)`
  font-size: 0.75rem;
  border-color: rgba(99, 102, 241, 0.35); /* indigo */
  color: #c7d2fe;
  background: rgba(67, 56, 202, 0.25);
`;

const SmallMeta = styled.div`
  color: #94a3b8;
  font-size: 0.85rem;
  line-height: 1.45;

  & > p {
    margin: 0;
  }
`;

const DetailsCard = styled(SCard)`
  position: sticky;
  top: 1.5rem;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.95));
  border-color: rgba(71, 85, 105, 0.7);
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.45);
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.5rem;
  font-weight: 700;
  color: #e2e8f0;
`;

const Separator = styled(SSeparator)`
  background: rgba(71, 85, 105, 0.5);
`;

const ResourceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  font-size: 0.95rem;
`;

const ResourceLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ResourceValue = styled.span<{ $v: number }>`
  font-weight: 700;
  color: ${({ $v }) => ($v >= 70 ? "#22c55e" : $v >= 40 ? "#eab308" : "#ef4444")};
`;

const Progress = styled(SProgress)`
  height: 8px;
  background: #334155; /* slate-700 track */
  border-radius: 9999px;
`;

const PrimaryBadgeRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
`;

const OutlineBadge = styled(SBadge)`
  font-size: 0.7rem;
  border-color: rgba(148, 163, 184, 0.5);
  color: #e2e8f0;
  background: transparent;
`;

const SeverityBadge = styled(SBadge)<{ $sev: "moderate" | "severe" | string }>`
  font-size: 0.7rem;
  ${({ $sev }) =>
    $sev === "severe"
      ? `background: rgba(239, 68, 68, .2); color:#fecaca;`
      : `background: rgba(59, 130, 246, .18); color:#bfdbfe;`}
  border: 1px solid rgba(148, 163, 184, .35);
`;

const CTA = styled(SButton)`
  width: 100%;
  margin-top: 1rem;
  background: linear-gradient(90deg, #60a5fa, #8b5cf6);
  color: #ffffff;
  border: 0;
  &:hover {
    filter: brightness(1.05);
  }
`;

const predefinedAvatars: Avatar[] = [
  {
    id: "maria-rodriguez",
    name: "Maria Rodriguez",
    age: 34,
    background:
      "Single mother working two jobs to support her family while facing housing discrimination",
    appearance: { skinTone: "medium", hairColor: "black", hairStyle: "long-wavy", clothing: "casual-work", accessories: ["small-earrings"] },
    initialResources: { money: 25, time: 40, energy: 35, socialSupport: 60, mentalHealth: 45, physicalHealth: 50 },
    socialContext: {
      socioeconomicStatus: "low",
      location: "Urban apartment",
      familyStructure: "Single parent with 2 children",
      educationLevel: "High school diploma",
      employmentStatus: "Two part-time jobs",
      healthConditions: ["Chronic fatigue"],
      socialIssues: [
        { id: "housing-discrimination", type: "racism", severity: "moderate", description: "Faces discrimination when searching for housing due to ethnicity", impacts: [] },
      ],
    },
  },
  {
    id: "james-thompson",
    name: "James Thompson",
    age: 28,
    background:
      "Recent college graduate with autism navigating the job market and social expectations",
    appearance: { skinTone: "light", hairColor: "brown", hairStyle: "short-neat", clothing: "business-casual", accessories: ["glasses"] },
    initialResources: { money: 45, time: 70, energy: 30, socialSupport: 40, mentalHealth: 35, physicalHealth: 80 },
    socialContext: {
      socioeconomicStatus: "middle",
      location: "Suburban home with parents",
      familyStructure: "Lives with supportive parents",
      educationLevel: "Bachelor's degree in Computer Science",
      employmentStatus: "Unemployed, actively job searching",
      healthConditions: ["Autism Spectrum Disorder", "Social anxiety"],
      socialIssues: [
        { id: "employment-disability", type: "disability", severity: "moderate", description: "Struggles with job interviews and workplace social dynamics due to autism", impacts: [] },
      ],
    },
  },
  {
    id: "aisha-johnson",
    name: "Aisha Johnson",
    age: 42,
    background:
      "Corporate professional experiencing workplace discrimination and microaggressions",
    appearance: { skinTone: "dark", hairColor: "black", hairStyle: "professional-short", clothing: "business-suit", accessories: ["professional-jewelry"] },
    initialResources: { money: 75, time: 50, energy: 55, socialSupport: 50, mentalHealth: 40, physicalHealth: 70 },
    socialContext: {
      socioeconomicStatus: "middle",
      location: "Urban condo",
      familyStructure: "Married, no children",
      educationLevel: "MBA",
      employmentStatus: "Senior Manager at tech company",
      healthConditions: ["Stress-related hypertension"],
      socialIssues: [
        { id: "workplace-racism", type: "racism", severity: "moderate", description: "Faces subtle discrimination and microaggressions in corporate environment", impacts: [] },
      ],
    },
  },
];

interface AvatarCreatorProps {
  onAvatarSelect: (avatar: Avatar) => void;
}

export function AvatarCreator({ onAvatarSelect }: AvatarCreatorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  const getIcon = (type: keyof Resources) => {
    const size = 16;
    switch (type) {
      case "money":
        return <DollarSign size={size} />;
      case "time":
        return <Clock size={size} />;
      case "energy":
        return <Zap size={size} />;
      case "socialSupport":
        return <Users size={size} />;
      case "mentalHealth":
        return <Brain size={size} />;
      case "physicalHealth":
        return <Activity size={size} />;
    }
  };

  const getLabel = (type: keyof Resources) => {
    switch (type) {
      case "money":
        return "Financial Resources";
      case "time":
        return "Available Time";
      case "energy":
        return "Energy Level";
      case "socialSupport":
        return "Social Support";
      case "mentalHealth":
        return "Mental Health";
      case "physicalHealth":
        return "Physical Health";
    }
  };

  return (
    <Page>
      <Header>
        <H2>Choose Your Avatar</H2>
        <Lead>
          Select a character to experience their unique challenges and perspectives. Each avatar
          represents real social issues faced by millions of people.
        </Lead>
      </Header>

      <Grid>
        <CardGrid>
          {predefinedAvatars.map((avatar) => (
            <Card
              key={avatar.id}
              $selected={selectedAvatar?.id === avatar.id}
              onClick={() => setSelectedAvatar(avatar)}
            >
              <CardHeader>
                <Row>
                  <Avatar>
                    <AvatarImage src={`/abstract-geometric-shapes.png?height=48&width=48&query=${avatar.name} avatar`} />
                    <AvatarFallback>
                      <User size={24} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{avatar.name}</CardTitle>
                    <Muted>Age {avatar.age}</Muted>
                  </div>
                </Row>
              </CardHeader>

              <CardContent>
                <CardDesc>{avatar.background}</CardDesc>

                <Chips>
                  {avatar.socialContext.socialIssues.map((issue) => (
                    <Chip key={issue.id}>{issue.type.replace("-", " ")}</Chip>
                  ))}
                </Chips>

                <SmallMeta>
                  <p>{avatar.socialContext.location}</p>
                  <p>{avatar.socialContext.employmentStatus}</p>
                </SmallMeta>
              </CardContent>
            </Card>
          ))}
        </CardGrid>

        {selectedAvatar ? (
          <DetailsCard>
            <SCardHeader>
              <Row style={{ marginBottom: ".75rem" }}>
                <Avatar style={{ width: 64, height: 64 }}>
                  <AvatarImage src={`/abstract-geometric-shapes.png?height=64&width=64&query=${selectedAvatar.name} portrait`} />
                  <AvatarFallback>
                    <User size={28} />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SCardTitle style={{ fontSize: "1.15rem", color: "#e5e7eb", margin: 0 }}>
                    {selectedAvatar.name}
                  </SCardTitle>
                  <Muted>Age {selectedAvatar.age}</Muted>
                </div>
              </Row>
            </SCardHeader>

            <SCardContent className="space-y-4">
              <div>
                <SectionTitle>Background</SectionTitle>
                <Lead as="p" style={{ maxWidth: "unset", color: "#9aa7bd" }}>
                  {selectedAvatar.background}
                </Lead>
              </div>

              <Separator />

              <div>
                <SectionTitle>Starting Resources</SectionTitle>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {Object.entries(selectedAvatar.initialResources).map(([key, value]) => (
                    <div key={key} style={{ display: "grid", gap: "0.35rem" }}>
                      <ResourceRow>
                        <ResourceLeft>
                          {getIcon(key as keyof Resources)}
                          <span>{getLabel(key as keyof Resources)}</span>
                        </ResourceLeft>
                        <ResourceValue $v={value}>{value}%</ResourceValue>
                      </ResourceRow>
                      <Progress value={value} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <SectionTitle>Primary Challenges</SectionTitle>
                <div style={{ display: "grid", gap: ".5rem" }}>
                  {selectedAvatar.socialContext.socialIssues.map((issue) => (
                    <div
                      key={issue.id}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.75rem",
                        background: "rgba(30,41,59,.45)",
                        border: "1px solid rgba(71,85,105,.55)",
                      }}
                    >
                      <PrimaryBadgeRow>
                        <OutlineBadge variant="outline">
                          {issue.type.replace("-", " ")}
                        </OutlineBadge>
                        <SeverityBadge $sev={issue.severity}>{issue.severity}</SeverityBadge>
                      </PrimaryBadgeRow>
                      <Lead as="p" style={{ color: "#9aa7bd", maxWidth: "unset", fontSize: ".9rem" }}>
                        {issue.description}
                      </Lead>
                    </div>
                  ))}
                </div>
              </div>

              <CTA onClick={() => onAvatarSelect(selectedAvatar)}>
                Begin Journey as {selectedAvatar.name}
              </CTA>
            </SCardContent>
          </DetailsCard>
        ) : (
          <DetailsCard>
            <SCardContent
              style={{
                display: "grid",
                placeItems: "center",
                height: "16rem",
                color: "#94a3b8",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <User size={48} style={{ marginBottom: "1rem", opacity: 0.8 }} />
                <div>Select an avatar to see their details</div>
              </div>
            </SCardContent>
          </DetailsCard>
        )}
      </Grid>
    </Page>
  );
}
