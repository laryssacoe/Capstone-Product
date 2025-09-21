"use client";

import styled from "styled-components";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  backPath?: string;
}

const HeaderBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  backdrop-filter: blur(8px);
  background: rgba(15, 23, 42, 0.75); /* slate-ish, tweak if you use a theme */
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
`;

const Inner = styled.div`
  max-width: 80rem; /* ~1280px */
  margin: 0 auto;
  height: 4rem; /* 64px */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: clamp(1rem, 2.2vw, 1.25rem);
  font-weight: 600;
  color: #e5e7eb;
  letter-spacing: 0.01em;
`;

const IconBtn = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

export function PageHeader({ title, showBackButton = true, backPath }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backPath) router.push(backPath);
    else router.back();
  };

  const handleHome = () => router.push("/");

  return (
    <HeaderBar>
      <Inner>
        <Left>
          {showBackButton && (
            <IconBtn variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft size={16} />
              Back
            </IconBtn>
          )}
          <Title>{title}</Title>
        </Left>

        <IconBtn variant="ghost" size="sm" onClick={handleHome}>
          <Home size={16} />
          Home
        </IconBtn>
      </Inner>
    </HeaderBar>
  );
}
