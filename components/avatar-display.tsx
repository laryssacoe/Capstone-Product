"use client";

import styled from "styled-components";
import {
  Avatar as UIAvatar,
  AvatarFallback as UIAvatarFallback,
  AvatarImage as UIAvatarImage,
} from "@/components/ui/avatar";
import { Card as UICard, CardContent as UICardContent } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Progress as UIProgress } from "@/components/ui/progress";
import { Button as UIButton } from "@/components/ui/button";
import type { Avatar, Resources } from "@/types/simulation";
import { User, DollarSign, Clock, Zap, Users, Brain, Activity, BarChart3 } from "lucide-react";

const Card = styled(UICard)`
  background: radial-gradient(120% 140% at 10% -20%, rgba(59,130,246,.12), transparent 55%),
              linear-gradient(180deg, rgba(15,23,42,.92), rgba(2,6,23,.96));
  border-color: rgba(71,85,105,.6);
  color: #e2e8f0; /* slate-200 */
  box-shadow: 0 10px 26px rgba(2,6,23,.45);
  backdrop-filter: blur(8px);
`;

const Content = styled(UICardContent)`
  padding: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const Avatar = styled(UIAvatar)`
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
`;
const AvatarImage = styled(UIAvatarImage)``;
const AvatarFallback = styled(UIAvatarFallback)`
  display: grid;
  place-items: center;
`;

const TitleWrap = styled.div`
  flex: 1;
  min-width: 0;
`;
const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #f1f5f9; /* slate-100 */
`;
const Subtle = styled.p`
  margin: .15rem 0 0;
  color: #94a3b8; /* slate-400 */
  font-size: .95rem;
`;

const IssueChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
  margin-top: .25rem;
`;
const IssueBadge = styled(UIBadge)`
  font-size: .7rem;
  border-color: rgba(148,163,184,.35);
  color: #c7d2fe;
  background: rgba(67,56,202,.22);
`;

const OutlineBtn = styled(UIButton)`
  border: 1px solid rgba(148,163,184,.32);
  color: #cbd5e1;
  background: transparent;
  &:hover { background: rgba(30,41,59,.6); color: #e2e8f0; }
  svg { margin-right: .375rem; }
`;

const SectionTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const TinyBadge = styled(UIBadge)`
  font-size: .7rem;
  color: #bfdbfe;
  background: rgba(59,130,246,.18);
  border: 1px solid rgba(148,163,184,.35);
`;

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;
const ResourceCell = styled.div`
  display: grid;
  gap: .35rem;
`;
const ResourceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  font-size: .95rem;
`;
const ResourceLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  color: #cbd5e1;
  svg { width: 16px; height: 16px; opacity: .95; }
`;
const ResourceValue = styled.span<{ $v: number }>`
  font-weight: 800;
  color: ${({ $v }) => ($v >= 70 ? "#22c55e" : $v >= 40 ? "#eab308" : "#ef4444")};
`;

const Progress = styled(UIProgress)`
  height: 8px;
  background: #334155; /* track */
  border-radius: 9999px;
`;

const CompactHeader = styled.div`
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: 1rem;
`;
const CompactAvatar = styled(UIAvatar)`
  width: 48px;
  height: 48px;
`;

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
`;

const CompactProgress = styled(UIProgress)`
  height: 4px;
  background: #334155;
  border-radius: 9999px;
`;

const IconButton = styled(UIButton)`
  border: 1px solid rgba(148,163,184,.32);
  color: #cbd5e1;
  background: transparent;
  padding: .35rem .5rem;
  &:hover { background: rgba(30,41,59,.6); color: #e2e8f0; }
  svg { width: 16px; height: 16px; }
`;

const iconFor = (type: keyof Resources) => {
  const size = 16;
  switch (type) {
    case "money": return <DollarSign size={size} />;
    case "time": return <Clock size={size} />;
    case "energy": return <Zap size={size} />;
    case "socialSupport": return <Users size={size} />;
    case "mentalHealth": return <Brain size={size} />;
    case "physicalHealth": return <Activity size={size} />;
  }
};

const labelFor = (type: keyof Resources, compact?: boolean) => {
  switch (type) {
    case "money": return compact ? "Money" : "Financial Resources";
    case "time": return compact ? "Time" : "Available Time";
    case "energy": return compact ? "Energy" : "Energy Level";
    case "socialSupport": return compact ? "Support" : "Social Support";
    case "mentalHealth": return compact ? "Mental" : "Mental Health";
    case "physicalHealth": return compact ? "Physical" : "Physical Health";
  }
};

interface AvatarDisplayProps {
  avatar: Avatar;
  currentResources: Resources;
  compact?: boolean;
  showResourceDashboard?: boolean;
  onShowResourceDashboard?: () => void;
}

export function AvatarDisplay({
  avatar,
  currentResources,
  compact = false,
  showResourceDashboard = false,
  onShowResourceDashboard,
}: AvatarDisplayProps) {
  if (compact) {
    return (
      <Card>
        <Content>
          <CompactHeader>
            <CompactAvatar>
              <AvatarImage src={`/abstract-geometric-shapes.png?height=48&width=48&query=${avatar.name} avatar`} />
              <AvatarFallback><User /></AvatarFallback>
            </CompactAvatar>
            <TitleWrap>
              <Title>{avatar.name}</Title>
              <Subtle>Age {avatar.age}</Subtle>
            </TitleWrap>
            {onShowResourceDashboard && (
              <IconButton variant="outline" size="sm" onClick={onShowResourceDashboard}>
                <BarChart3 />
              </IconButton>
            )}
          </CompactHeader>

          <CompactGrid>
            {Object.entries(currentResources).map(([k, v]) => (
              <ResourceCell key={k}>
                <ResourceRow>
                  <ResourceLeft>
                    {iconFor(k as keyof Resources)}
                    <span>{labelFor(k as keyof Resources, true)}</span>
                  </ResourceLeft>
                  <ResourceValue $v={v as number}>{v}%</ResourceValue>
                </ResourceRow>
                <CompactProgress value={v as number} />
              </ResourceCell>
            ))}
          </CompactGrid>
        </Content>
      </Card>
    );
  }

  return (
    <Card>
      <Content>
        <HeaderRow>
          <Avatar>
            <AvatarImage src={`/abstract-geometric-shapes.png?height=64&width=64&query=${avatar.name} portrait`} />
            <AvatarFallback><User /></AvatarFallback>
          </Avatar>

          <TitleWrap>
            <Title>{avatar.name}</Title>
            <Subtle>Age {avatar.age}</Subtle>
            <IssueChips>
              {avatar.socialContext.socialIssues.map((issue) => (
                <IssueBadge key={issue.id}>{issue.type.replace("-", " ")}</IssueBadge>
              ))}
            </IssueChips>
          </TitleWrap>

          {onShowResourceDashboard && (
            <OutlineBtn variant="outline" onClick={onShowResourceDashboard}>
              <BarChart3 /> Manage Resources
            </OutlineBtn>
          )}
        </HeaderRow>

        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionTop>
            <h4 style={{ margin: 0, fontWeight: 700, color: "#e2e8f0" }}>Current Resources</h4>
            {showResourceDashboard && <TinyBadge>Dashboard Active</TinyBadge>}
          </SectionTop>

          <ResourceGrid>
            {Object.entries(currentResources).map(([k, v]) => (
              <ResourceCell key={k}>
                <ResourceRow>
                  <ResourceLeft>
                    {iconFor(k as keyof Resources)}
                    <span>{labelFor(k as keyof Resources)}</span>
                  </ResourceLeft>
                  <ResourceValue $v={v as number}>{v}%</ResourceValue>
                </ResourceRow>
                <Progress value={v as number} />
              </ResourceCell>
            ))}
          </ResourceGrid>
        </div>
      </Content>
    </Card>
  );
}
