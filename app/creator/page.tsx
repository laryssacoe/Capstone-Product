"use client"

import type React from "react"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import styled, { keyframes } from "styled-components"
import AppHeader from "@/components/app-header"
import emailjs from '@emailjs/browser';
import { BookOpen, ClipboardCheck, UploadCloud, Info, User, Image as ImageIcon, Music, Trash2, Upload, FolderOpen, FileJson, Copy } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { CreatorWalkthrough, WelcomeModal } from "@/components/creator-walkthrough"
import FlowStudioPage from "@/components/creator/flow-studio-page"
import {
  avatarTemplateJson,
  storyGraphTemplateJson,
  twineJsonExample,
  twineChecklistSections,
} from "@/lib/creator-story-templates"
import { time } from "console"

// Keyframes
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

// Base styled components
const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #0f172a;
  color: rgb(241, 245, 249);
`

const LoadingContainer = styled.div`
  min-height: 100vh;
  background-color: #0f172a;
  color: rgb(241, 245, 249);
  display: flex;
  align-items: center;
  justify-content: center;
`

const LoadingContent = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const LoadingDot = styled.div`
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  border-radius: 50%;
  height: 16px;
  width: 16px;
  background-color: #60a5fa;
  margin: 0 auto;
`

const LoadingText = styled.p`
  color: rgb(148, 163, 184);
  font-size: 14px;
`

const MainContent = styled.main`
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`

const PageTitle = styled.h1`
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin: 0;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const WarningBanner = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.4);
  background-color: rgba(245, 158, 11, 0.1);
  padding: 16px 20px;
  font-size: 14px;
  color: rgb(254, 243, 199);
`

const WarningText = styled.p`
  font-weight: 500;
  margin: 0;
`

const SuccessMessage = styled.p`
  color: rgb(110, 231, 183);
  font-size: 14px;
  background-color: rgba(6, 78, 59, 0.2);
  border: 1px solid rgb(6, 78, 59);
  border-radius: 8px;
  padding: 16px;
  margin: 0;
`

const ErrorMessage = styled.p`
  color: rgb(252, 165, 165);
  font-size: 14px;
  background-color: rgba(127, 29, 29, 0.2);
  border: 1px solid rgb(127, 29, 29);
  border-radius: 8px;
  padding: 16px;
  margin: 0;
`

// Tabs
const TabsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const TabsList = styled.div`
  background-color: rgba(30, 41, 59, 0.6);
  border: 1px solid rgb(51, 65, 85);
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  padding: 4px;
`

const TabTrigger = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background-color: ${({ $active }) => $active ? 'rgb(51, 65, 85)' : 'transparent'};
  color: ${({ $active }) => $active ? 'white' : 'rgb(148, 163, 184)'};

  &:hover {
    color: white;
    background-color: ${({ $active }) => $active ? 'rgb(51, 65, 85)' : 'rgba(51, 65, 85, 0.5)'};
  }
`

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

// Cards
const Card = styled.div`
  background-color: rgba(30, 41, 59, 0.5);
  border: 1px solid rgb(51, 65, 85);
  border-radius: 16px;
  overflow: hidden;
`

const CardHeader = styled.div`
  padding: 24px 24px 0 24px;
`

const CardTitle = styled.h2`
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
`

const CardDescription = styled.p`
  color: rgb(148, 163, 184);
  font-size: 14px;
  margin: 0;
`

const CardContent = styled.div`
  padding: 24px;
`

const CardContentFlex = styled(CardContent)`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const EmptyState = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  background-color: rgba(30, 41, 59, 0.4);
  padding: 96px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const EmptyIcon = styled.div`
  color: #60a5fa;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const EmptyTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: white;
  margin: 0 0 8px 0;
`

const EmptyText = styled.p`
  color: rgb(148, 163, 184);
  margin: 0;
`

const StoriesGrid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StoryCard = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  background-color: rgba(30, 41, 59, 0.4);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 0.2s;
  height: 100%;         
  min-height: 340px;     

  &:hover {
    border-color: rgba(59, 130, 246, 0.5);
  }
`

const StoryHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

const StoryAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
`

const StoryAvatarImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const StoryAvatarFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #f8fafc;
`

const StoryInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const StoryTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ExampleBadge = styled.span`
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: #60a5fa;
  background-color: rgba(59, 130, 246, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
`

const StoryMeta = styled.p`
  font-size: 12px;
  color: #c084fc;
  margin: 0;
`

const StorySummary = styled.p`
  font-size: 14px;
  color: rgb(148, 163, 184);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;               
`

const StoryFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(51, 65, 85, 0.5);
`

const VisibilityBadge = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  background-color: rgba(51, 65, 85, 0.5);
  color: rgb(203, 213, 225);
  text-transform: capitalize;
`

const PassageCount = styled.span`
  color: rgb(100, 116, 139);
`

const StoryActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;      
`

const ActionButtonRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`

const StatusBadge = styled.div<{ $variant: 'pending' | 'approved' }>`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  
  ${({ $variant }) => $variant === 'pending' ? `
    background-color: rgba(113, 63, 18, 0.2);
    border: 1px solid rgba(161, 98, 7, 0.5);
    color: rgb(253, 224, 71);
  ` : `
    background-color: rgba(6, 78, 59, 0.2);
    border: 1px solid rgba(4, 120, 87, 0.5);
    color: rgb(110, 231, 183);
  `}
`

const CreateButtonContainer = styled.div`
  padding-top: 16px;
  display: flex;
  justify-content: center;
`

// Buttons
const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'; $size?: 'sm' | 'md' | 'lg'; $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  border: none;
  
  ${({ $fullWidth }) => $fullWidth && 'width: 100%;'}
  
  ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return 'padding: 6px 12px; font-size: 14px;'
      case 'lg':
        return 'padding: 12px 32px; font-size: 18px;'
      default:
        return 'padding: 8px 16px; font-size: 14px;'
    }
  }}
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'secondary':
        return `
          background-color: #9333ea;
          color: white;
          &:hover { background-color: #7c3aed; }
        `
      case 'outline':
        return `
          background-color: transparent;
          color: rgb(203, 213, 225);
          border: 1px solid rgb(71, 85, 105);
          &:hover { background-color: rgb(30, 41, 59); color: white; }
        `
      case 'ghost':
        return `
          background-color: transparent;
          color: rgb(203, 213, 225);
          &:hover { background-color: rgba(30, 41, 59, 0.6); color: white; }
        `
      case 'danger':
        return `
          background-color: rgba(127, 29, 29, 0.2);
          color: rgb(252, 165, 165);
          border: 1px solid rgba(127, 29, 29, 0.5);
          &:hover { background-color: rgba(127, 29, 29, 0.3); }
        `
      default:
        return `
          background-color: #2563eb;
          color: white;
          &:hover { background-color: #1d4ed8; }
        `
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ButtonLink = styled(Link)<{ $variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  padding: 8px 16px;
  font-size: 14px;
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'outline':
        return `
          background-color: transparent;
          color: rgb(203, 213, 225);
          border: 1px solid rgb(71, 85, 105);
          &:hover { background-color: rgb(30, 41, 59); color: white; }
        `
      case 'ghost':
        return `
          background-color: transparent;
          color: rgb(226, 232, 240);
          &:hover { background-color: rgba(30, 41, 59, 0.6); color: white; }
        `
      default:
        return `
          background-color: #2563eb;
          color: white;
          &:hover { background-color: #1d4ed8; }
        `
    }
  }}
`

const WarningButtonLink = styled(ButtonLink)`
  margin-top: 12px;
  border-color: rgba(253, 186, 116, 0.6);
  color: rgb(254, 249, 195);
`

// Form Elements
const FormGrid = styled.div`
  display: grid;
  gap: 16px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: rgb(226, 232, 240);
`

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgb(51, 65, 85);
  background-color: rgb(15, 23, 42);
  color: white;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  &::placeholder {
    color: rgb(100, 116, 139);
  }
`

const Textarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgb(51, 65, 85);
  background-color: rgb(15, 23, 42);
  color: white;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`

const MonoTextarea = styled(Textarea)`
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
`

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgb(51, 65, 85);
  background-color: rgb(15, 23, 42);
  color: rgb(226, 232, 240);
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgb(100, 116, 139);
  background-color: transparent;
  cursor: pointer;
  
  &:checked {
    background-color: #8b5cf6;
    border-color: #8b5cf6;
  }
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
`

// Info Boxes
const InfoBox = styled.div<{ $color: 'blue' | 'purple' | 'emerald' | 'amber' }>`
  border-radius: 12px;
  padding: 16px;
  
  ${({ $color }) => {
    switch ($color) {
      case 'purple':
        return `
          border: 1px solid rgba(168, 85, 247, 0.3);
          background-color: rgba(168, 85, 247, 0.1);
        `
      case 'emerald':
        return `
          border: 1px solid rgba(16, 185, 129, 0.3);
          background-color: rgba(16, 185, 129, 0.1);
        `
      case 'amber':
        return `
          border: 1px solid rgba(245, 158, 11, 0.3);
          background-color: rgba(245, 158, 11, 0.1);
        `
      default:
        return `
          border: 1px solid rgba(59, 130, 246, 0.3);
          background-color: rgba(59, 130, 246, 0.1);
        `
    }
  }}
`

const InfoBoxWithMargin = styled(InfoBox)`
  margin-bottom: 24px;
`

const InfoBoxPadded = styled(InfoBox)`
  padding: 20px;
`

const InfoBoxCompact = styled(InfoBox)`
  padding: 8px 12px;
  margin-bottom: 12px;
`

const InfoBoxHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

const InfoBoxIcon = styled.div<{ $color: string }>`
  color: ${({ $color }) => $color};
  flex-shrink: 0;
  margin-top: 2px;
`

const InfoBoxContent = styled.div`
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const InfoBoxContentBlue = styled(InfoBoxContent)`
  color: rgb(191, 219, 254);
`

const InfoBoxTitle = styled.p`
  font-weight: 500;
  margin: 0;
`

const InfoBoxList = styled.ul`
  list-style: disc;
  list-style-position: inside;
  margin: 0;
  padding: 0;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const InfoBoxListBlue = styled(InfoBoxList)`
  color: rgba(147, 197, 253, 0.9);
`

// Section with header and checkbox
const SectionBox = styled.div<{ $color: 'purple' | 'emerald' }>`
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  ${({ $color }) => $color === 'purple' ? `
    border: 1px solid rgba(168, 85, 247, 0.3);
    background-color: rgba(168, 85, 247, 0.1);
  ` : `
    border: 1px solid rgba(16, 185, 129, 0.3);
    background-color: rgba(16, 185, 129, 0.1);
  `}
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SectionHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const SectionIcon = styled.div<{ $color: string }>`
  color: ${({ $color }) => $color};
`

const SectionTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
  margin: 0;
`

const SectionTitlePurple = styled(SectionTitle)`
  color: rgb(243, 232, 255);
`

const SectionTitleEmerald = styled(SectionTitle)`
  color: rgb(209, 250, 229);
`

const SectionSubtitle = styled.p`
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
`

const SectionSubtitlePurple = styled(SectionSubtitle)`
  color: rgba(216, 180, 254, 0.8);
`

const SectionSubtitleEmerald = styled(SectionSubtitle)`
  color: rgba(110, 231, 183, 0.8);
`

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
`

const ToggleLabelPurple = styled(ToggleLabel)`
  color: rgb(233, 213, 255);
`

// Media Library
const MediaGrid = styled.div`
  display: grid;
  gap: 12px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const MediaItem = styled.div`
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.7);
  background-color: rgba(15, 23, 42, 0.7);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MediaItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const MediaThumbnail = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  background-color: rgb(30, 41, 59);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

const MediaThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const MediaInput = styled(Input)`
  height: 32px;
  font-size: 12px;
`

const MediaSelect = styled(Select)`
  font-size: 12px;
  padding: 4px 8px;
`

const MediaSelectFlex = styled(MediaSelect)`
  flex: 1;
`

const MediaPath = styled.div`
  font-size: 10px;
  color: rgb(100, 116, 139);
`

const CropPreviewWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
`

const CropPreviewLabel = styled.span`
  font-size: 11px;
  color: rgb(148, 163, 184);
`

const CropPreviewBox = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(71, 85, 105, 0.6);
  background: rgb(15, 23, 42);
`

const CropPreviewImage = styled.img<{ $x: number; $y: number; $zoom: number }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: ${({ $x, $y }) => `${$x}% ${$y}%`};
  transform: scale(${({ $zoom }) => $zoom});
  transform-origin: center;
`

const CropSliderGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const CropSliderField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  color: rgb(100, 116, 139);
`

const CropSlider = styled.input`
  width: 100%;
  accent-color: rgb(139, 92, 246);
`

const CropPreviewHint = styled.span`
  font-size: 10px;
  color: rgb(100, 116, 139);
`

const MediaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const MediaLabel = styled.span`
  font-size: 12px;
  color: rgb(148, 163, 184);
  flex-shrink: 0;
`

const MediaInputWrapper = styled.div`
  flex: 1;
  min-width: 0;
`

// Button Row
const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const ButtonRowPadded = styled(ButtonRow)`
  padding-top: 8px;
`

const SaveHintWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const SaveHint = styled.div`
  position: absolute;
  left: 0;
  bottom: calc(100% + 12px);
  max-width: 240px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(96, 165, 250, 0.6);
  color: rgb(226, 232, 240);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.5);
  z-index: 10;

  &::after {
    content: "";
    position: absolute;
    left: 16px;
    bottom: -6px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(96, 165, 250, 0.6);
  }

  &::before {
    content: "";
    position: absolute;
    left: 16px;
    bottom: -5px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(15, 23, 42, 0.95);
    z-index: 1;
  }
`

const SaveHintTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`

const SaveHintDismiss = styled.div`
  margin-top: 8px;
`

const SaveHintButton = styled.button`
  background: transparent;
  border: none;
  color: rgb(148, 197, 253);
  cursor: pointer;
  font-size: 11px;
  padding: 0;
`

const SmallButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`

const GraphEditorRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
`

const GraphEditorHint = styled.span`
  font-size: 12px;
  color: rgb(148, 163, 184);
`

// Editing Banner
const EditingBanner = styled.div`
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px;
  border: 1px solid rgba(51, 65, 85, 0.7);
  background-color: rgba(15, 23, 42, 0.6);
  padding: 16px;
`

const EditingBannerText = styled.div`
  font-size: 14px;
  color: rgb(203, 213, 225);
`

const EditingBannerTitle = styled.p`
  font-weight: 500;
  color: rgb(241, 245, 249);
  margin: 0;
`

const EditingBannerSubtitle = styled.p`
  color: rgb(148, 163, 184);
  margin: 0;
`

const ImportGrid = styled.div`
  display: grid;
  gap: 24px;
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));  
  }
`

const ImportColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;          
  overflow: hidden;      
`

const CodeBlock = styled.pre`
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid rgb(51, 65, 85);
  background-color: rgba(2, 6, 23, 0.7);
  padding: 12px;
  font-size: 10px;
  color: rgb(203, 213, 225);
  max-height: 288px;
  overflow-y: auto;
  white-space: pre-wrap;   
  word-break: break-word;  
`

const SmallCodeBlock = styled.pre`
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid rgb(51, 65, 85);
  background-color: rgba(2, 6, 23, 0.7);
  padding: 12px;
  font-size: 12px;
  color: rgb(226, 232, 240);
  white-space: pre-wrap;  
  word-break: break-word;  
`

const LinkRow = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const ExternalLink = styled.a<{ $color: 'purple' | 'slate' }>`
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  
  ${({ $color }) => $color === 'purple' ? `
    border: 1px solid rgba(168, 85, 247, 0.4);
    background-color: rgba(168, 85, 247, 0.1);
    color: rgb(216, 180, 254);
    &:hover { background-color: rgba(168, 85, 247, 0.2); }
  ` : `
    border: 1px solid rgb(71, 85, 105);
    background-color: rgba(30, 41, 59, 0.6);
    color: rgb(226, 232, 240);
    &:hover { background-color: rgba(51, 65, 85, 0.7); }
  `}
`

// Checklist
const ChecklistContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 8px;
`

const ChecklistSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ChecklistSectionTitle = styled.h4`
  font-size: 12px;
  font-weight: 600;
  color: rgb(216, 180, 254);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
`

const ChecklistItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ChecklistItem = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: rgb(203, 213, 225);
  cursor: pointer;
`

const ChecklistCheckbox = styled.input.attrs({ type: 'checkbox' })`
  margin-top: 2px;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid rgb(100, 116, 139);
  
  &:checked {
    background-color: #a855f7;
    border-color: #a855f7;
  }
`

const ChecklistItemText = styled.span`
  line-height: 1.5;
`

// Dialogs
const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

const DialogContent = styled.div`
  background-color: rgb(15, 23, 42);
  border: 1px solid rgb(51, 65, 85);
  border-radius: 12px;
  max-width: 480px;
  width: 100%;
  padding: 24px;
`

const DialogTitle = styled.h2`
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
`

const DialogDescription = styled.p`
  font-size: 14px;
  color: rgb(203, 213, 225);
  margin: 0 0 16px 0;
`

const DialogBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: rgb(226, 232, 240);
`

const DialogFooter = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`

// Unauthenticated states
const UnauthContainer = styled.div`
  max-width: 896px;
  margin: 0 auto;
  padding: 64px 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgb(148, 163, 184);
  text-decoration: none;
  transition: color 0.2s;
  
  &:hover {
    color: white;
  }
`

const UnauthCard = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  background-color: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(4px);
  padding: 32px;
`

const UnauthTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px 0;
`

const UnauthText = styled.p`
  color: rgb(148, 163, 184);
  margin: 0 0 24px 0;
`

const UnauthButtons = styled.div`
  display: flex;
  gap: 12px;
`

// Additional styled components for inline styles
const FormFlex = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const ConflictText = styled.span`
  font-size: 14px;
  color: rgb(252, 165, 165);
`

const HiddenInput = styled.input`
  display: none;
`

const AvatarUploadBox = styled.div`
  margin-top: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(192, 132, 252, 0.4);
  padding: 12px;
  background: rgba(76, 29, 149, 0.15);
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const AvatarUploadTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: rgb(233, 213, 255);
`

const AvatarUploadDescription = styled.div`
  font-size: 12px;
  color: rgba(216, 180, 254, 0.8);
`

const AvatarUploadError = styled.span`
  color: rgb(252, 165, 165);
  font-size: 12px;
`

const AvatarUploadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const AvatarPreviewContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const AvatarPreviewImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(216, 180, 254, 0.6);
`

const AvatarPreviewPath = styled.span`
  font-size: 11px;
  color: rgba(216, 180, 254, 0.8);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const AvatarFormGrid = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const AvatarSectionTitle = styled.p`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(216, 180, 254, 0.85);
  margin: 0;
`

const AvatarHintText = styled.p`
  font-size: 12px;
  color: rgba(216, 180, 254, 0.72);
  margin: 0;
`

const AvatarResourceReadOnly = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const AvatarResourceTile = styled.div`
  border: 1px solid rgba(192, 132, 252, 0.35);
  border-radius: 8px;
  background: rgba(76, 29, 149, 0.22);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const AvatarResourceLabel = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(216, 180, 254, 0.7);
`

const AvatarResourceValue = styled.span`
  font-size: 14px;
  color: rgb(243, 232, 255);
  font-weight: 600;
`

const PurpleOutlineButton = styled(Button)`
  border-color: rgba(192, 132, 252, 0.6);
  color: rgb(216, 180, 254);
`

const EmeraldOutlineButton = styled(Button)`
  border-color: rgba(16, 185, 129, 0.5);
  color: rgb(167, 243, 208);
`

const EmeraldOutlineButtonSelfStart = styled(EmeraldOutlineButton)`
  align-self: flex-start;
`

const ResourcesBox = styled.div`
  margin-top: 8px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid rgba(96, 165, 250, 0.25);
  padding: 12px;
  background: rgba(15, 23, 42, 0.35);
`

const ResourcesTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: rgb(191, 219, 254);
  margin-bottom: 6px;
`

const ResourcesDescription = styled.div`
  font-size: 12px;
  color: rgba(148, 163, 184, 0.9);
  margin-bottom: 10px;
`

const ResourcesError = styled.span`
  color: rgb(252, 165, 165);
  font-size: 12px;
`

const MediaLibraryError = styled.span`
  color: rgb(252, 165, 165);
  font-size: 12px;
  background-color: rgba(127, 29, 29, 0.2);
  border: 1px solid rgb(127, 29, 29);
  border-radius: 4px;
  padding: 8px;
`

const MediaListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const MediaListTitle = styled.span`
  font-size: 12px;
  color: rgb(110, 231, 183);
  font-weight: 500;
`

const MediaNote = styled.span`
  font-size: 12px;
  color: rgb(100, 116, 139);
`

const CopyButton = styled(Button)`
  color: rgb(147, 197, 253);
  padding: 4px;
`

const DeleteButton = styled(Button)`
  color: rgb(248, 113, 113);
  padding: 4px;
`

const IconWrapper = styled.span`
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
`

const ImportInfoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
`

const ImportInfoTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin: 0;
`

const ImportInfoContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: rgb(191, 219, 254);
`

const ImportInfoParagraph = styled.p`
  margin: 0;
`

const ImportMappingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
`

const ImportMappingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ImportMappingSource = styled.span`
  color: rgb(216, 180, 254);
  font-family: monospace;
`

const ImportMappingArrow = styled.span`
  color: rgb(100, 116, 139);
`

const ImportMappingTarget = styled.span`
  color: rgb(147, 197, 253);
`

const TwisonFormatBox = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(51, 65, 85, 0.7);
  background-color: rgba(15, 23, 42, 0.4);
  padding: 20px;
`

const CLIDescription = styled.p`
  font-size: 12px;
  color: rgb(167, 243, 208);
  margin: 0 0 12px 0;
`

const AmberNoteText = styled.p`
  font-size: 12px;
  color: rgb(254, 243, 199);
  margin: 0;
`

const ClearChecklistButton = styled(Button)`
  margin-top: 12px;
  font-size: 12px;
  color: rgb(148, 163, 184);
`

const DialogCheckbox = styled(Checkbox)`
  margin-top: 2px;
`

// Interfaces (same as original)
interface StoryChoice {
  id: string
  text: string
  leads_to: string
  effects?: {
    money?: number
    health?: number
    mentalHealth?: number
    support?: number
    time?: number
  }
}

interface CreatorStoryNode {
  key: string
  title?: string | null
  synopsis?: string | null
  type?: string
  content?: {
    text?: string | string[]
    emotion?: string
    intensity?: number
    next?: string
    choices?: StoryChoice[]
  }
  media?: {
    visual?: string
    image?: string
    audio?: string
  }
}

interface CreatorStoryPath {
  key: string
  label: string
  summary?: string | null
  metadata?: unknown
}

interface CreatorStoryTransition {
  from: string
  to?: string | null
  path: string
  ordering?: number | null
  condition?: unknown
  effect?: unknown
}

interface AvatarMetadata {
  name: string
  age?: number
  background: string
  appearance: {
    skinTone?: string
    hairColor?: string
    hairStyle?: string
    clothing?: string
    accessories?: string[]
    image?: string
  }
  initialResources: {
    money: number
    time: number
    health?: number
    socialSupport?: number
    mentalHealth?: number
    physicalHealth?: number
  }
  socialContext?: {
    socioeconomicStatus?: string
    location?: string
    familyStructure?: string
    educationLevel?: string
    employmentStatus?: string
    healthConditions?: string[]
    socialIssues?: {
      id: string
      type: string
      severity: string
      description: string
      impacts: string[]
    }[]
  }
  isPlayable: boolean
}

interface CreatorStory {
  id: string
  slug: string
  title: string
  summary?: string | null
  tags: string[]
  visibility: string
  reviewStatus?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED"
  createdAt: string
  updatedAt: string
  nodes: CreatorStoryNode[]
  paths: CreatorStoryPath[]
  transitions: CreatorStoryTransition[]
  metadata?: {
    avatar?: AvatarMetadata
  }
}

interface UploadedMedia {
  id: string
  file?: File  
  name: string
  type: "image" | "audio"
  url: string  
  mappedToNode?: string
  serverPath?: string
  cropPreview?: {
    x: number
    y: number
    zoom: number
  }
}

interface NodeKeyInfo {
  key: string
  title: string
}

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
}

const createDefaultCropPreview = () => ({
  x: 50,
  y: 50,
  zoom: 1,
})

function validateGraph(graph: any): { ok: true } | { ok: false; message: string } {
  if (!graph || typeof graph !== "object") return { ok: false, message: "Graph is missing." }
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0)
    return { ok: false, message: "Graph must include at least one node." }
  if (!Array.isArray(graph.paths) || graph.paths.length === 0)
    return { ok: false, message: "Graph must include at least one path." }
  if (!Array.isArray(graph.transitions) || graph.transitions.length === 0)
    return { ok: false, message: "Graph must include at least one transition." }

  const nodeKeys = new Set<string>()
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i]
    if (!node || typeof node !== "object") return { ok: false, message: `Node ${i + 1} is not an object.` }
    if (!node.key || typeof node.key !== "string" || !node.key.trim())
      return { ok: false, message: `Node ${i + 1} is missing a valid 'key'.` }
    const text = node.content?.text
    if (!text || (!Array.isArray(text) && typeof text !== "string")) {
      return { ok: false, message: `Node "${node.key}" must have content.text as a string or array of strings.` }
    }
    nodeKeys.add(node.key)
  }

  const pathKeys = new Set<string>()
  for (let i = 0; i < graph.paths.length; i++) {
    const path = graph.paths[i]
    if (!path || typeof path !== "object") return { ok: false, message: `Path ${i + 1} is not an object.` }
    if (!path.key || typeof path.key !== "string" || !path.key.trim())
      return { ok: false, message: `Path ${i + 1} is missing a valid 'key'.` }
    if (!path.label || typeof path.label !== "string" || !path.label.trim())
      return { ok: false, message: `Path ${i + 1} is missing a valid 'label'.` }
    pathKeys.add(path.key)
  }

  for (let i = 0; i < graph.transitions.length; i++) {
    const transition = graph.transitions[i]
    if (!transition || typeof transition !== "object")
      return { ok: false, message: `Transition ${i + 1} is not an object.` }
    if (!transition.from || typeof transition.from !== "string" || !transition.from.trim())
      return { ok: false, message: `Transition ${i + 1} is missing 'from'.` }
    if (!transition.path || typeof transition.path !== "string" || !transition.path.trim())
      return { ok: false, message: `Transition ${i + 1} is missing 'path'.` }
    if (!nodeKeys.has(transition.from))
      return { ok: false, message: `Transition ${i + 1}: 'from' references unknown node '${transition.from}'.` }
    if (!pathKeys.has(transition.path))
      return { ok: false, message: `Transition ${i + 1}: 'path' references unknown path '${transition.path}'.` }
    if (transition.to != null && typeof transition.to === "string" && !nodeKeys.has(transition.to)) {
      return { ok: false, message: `Transition ${i + 1}: 'to' references unknown node '${transition.to}'.` }
    }
  }

  for (const node of graph.nodes) {
    if (node.content?.choices) {
      for (const choice of node.content.choices) {
        if (!choice.id || !choice.text || !choice.leads_to) {
          return { ok: false, message: `Node "${node.key}": Each choice must have id, text, and leads_to.` }
        }
        if (!nodeKeys.has(choice.leads_to)) {
          return { ok: false, message: `Node "${node.key}": Choice "${choice.id}" leads_to unknown node "${choice.leads_to}".` }
        }
      }
    }
    if (node.content?.next && !nodeKeys.has(node.content.next)) {
      return { ok: false, message: `Node "${node.key}": 'next' references unknown node "${node.content.next}".` }
    }
  }

  return { ok: true }
}

const defaultGraphResources = {
  money: 500,
  time: 100,
  health: 100,
}

function extractGraphInitialResources(graph: any) {
  const resources = graph?.initialResources ?? {}
  return {
    money: typeof resources.money === "number" ? resources.money : defaultGraphResources.money,
    time: typeof resources.time === "number" ? resources.time : defaultGraphResources.time,
    health: typeof resources.health === "number" ? resources.health : defaultGraphResources.health,
  }
}

function applyGraphInitialResourcesToAvatar(
  avatar: AvatarMetadata,
  graphInitialResources: ReturnType<typeof extractGraphInitialResources>,
): AvatarMetadata {
  const baseResources: Partial<AvatarMetadata["initialResources"]> =
    avatar.initialResources && typeof avatar.initialResources === "object"
      ? avatar.initialResources
      : {}

  return {
    ...avatar,
    initialResources: {
      ...baseResources,
      money: graphInitialResources.money,
      time: graphInitialResources.time,
      health: graphInitialResources.health,
      socialSupport: typeof baseResources.socialSupport === "number" ? baseResources.socialSupport : 50,
      mentalHealth: typeof baseResources.mentalHealth === "number" ? baseResources.mentalHealth : 70,
      physicalHealth: typeof baseResources.physicalHealth === "number" ? baseResources.physicalHealth : 80,
    },
  }
}

function validateAvatarMetadata(avatar: any): { ok: true } | { ok: false; message: string } {
  if (!avatar || typeof avatar !== "object") {
    return { ok: false, message: "Avatar metadata is missing or invalid." }
  }
  if (!avatar.name || typeof avatar.name !== "string") {
    return { ok: false, message: "Avatar must have a name." }
  }
  if (!avatar.background || typeof avatar.background !== "string") {
    return { ok: false, message: "Avatar must have a background description." }
  }
  if (!avatar.initialResources || typeof avatar.initialResources !== "object") {
    return { ok: false, message: "Avatar must have initialResources." }
  }
  const resources = avatar.initialResources
  if (typeof resources.money !== "number" || typeof resources.time !== "number") {
    return { ok: false, message: "Avatar initialResources must include money and time as numbers." }
  }
  if (resources.health != null && typeof resources.health !== "number") {
    return { ok: false, message: "Avatar initialResources health must be a number." }
  }
  return { ok: true }
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
}

function normalizeAvatarMetadata(avatar: unknown): AvatarMetadata {
  const source = avatar && typeof avatar === "object" ? (avatar as Record<string, any>) : {}
  const appearance = source.appearance && typeof source.appearance === "object" ? source.appearance : {}
  const resources = source.initialResources && typeof source.initialResources === "object" ? source.initialResources : {}
  const socialContext = source.socialContext && typeof source.socialContext === "object" ? source.socialContext : {}

  const parsedAge =
    typeof source.age === "number" && Number.isFinite(source.age)
      ? source.age
      : typeof source.age === "string" && source.age.trim()
      ? Number(source.age)
      : undefined

  return {
    name: typeof source.name === "string" ? source.name : "",
    age: typeof parsedAge === "number" && Number.isFinite(parsedAge) ? parsedAge : undefined,
    background: typeof source.background === "string" ? source.background : "",
    appearance: {
      skinTone: typeof appearance.skinTone === "string" ? appearance.skinTone : "",
      hairColor: typeof appearance.hairColor === "string" ? appearance.hairColor : "",
      hairStyle: typeof appearance.hairStyle === "string" ? appearance.hairStyle : "",
      clothing: typeof appearance.clothing === "string" ? appearance.clothing : "",
      accessories: toStringList(appearance.accessories),
      image: typeof appearance.image === "string" ? appearance.image : "",
    },
    initialResources: {
      money: typeof resources.money === "number" ? resources.money : 100,
      time: typeof resources.time === "number" ? resources.time : 100,
      health: typeof resources.health === "number" ? resources.health : 100,
      socialSupport: typeof resources.socialSupport === "number" ? resources.socialSupport : 50,
      mentalHealth: typeof resources.mentalHealth === "number" ? resources.mentalHealth : 70,
      physicalHealth: typeof resources.physicalHealth === "number" ? resources.physicalHealth : 80,
    },
    socialContext: {
      socioeconomicStatus:
        typeof socialContext.socioeconomicStatus === "string" ? socialContext.socioeconomicStatus : "",
      location: typeof socialContext.location === "string" ? socialContext.location : "",
      familyStructure: typeof socialContext.familyStructure === "string" ? socialContext.familyStructure : "",
      educationLevel: typeof socialContext.educationLevel === "string" ? socialContext.educationLevel : "",
      employmentStatus: typeof socialContext.employmentStatus === "string" ? socialContext.employmentStatus : "",
      healthConditions: toStringList(socialContext.healthConditions),
      socialIssues: Array.isArray(socialContext.socialIssues) ? socialContext.socialIssues : [],
    },
    isPlayable: source.isPlayable !== false,
  }
}

function createAvatarMetadataTemplate(): AvatarMetadata {
  try {
    return normalizeAvatarMetadata(JSON.parse(avatarTemplateJson))
  } catch {
    return normalizeAvatarMetadata(null)
  }
}

const parseTagsString = (input: string) =>
  input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

const exampleStory = {
  slug: "my-first-story",
  title: "My First Story (Example)",
  summary: "A simple example showing how Loop stories work. Edit or delete this anytime!",
  tag: "example",
}

function CreatorDashboardContent() {
  const { toast } = useToast()
  const { user, loading, refresh } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [stories, setStories] = useState<CreatorStory[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [storiesMessage, setStoriesMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("New Story Title")
  const [summary, setSummary] = useState("Short description of this journey.")
  const [tags, setTags] = useState("community, empathy")
  const [visibility, setVisibility] = useState<"PRIVATE" | "UNLISTED" | "PUBLIC">("PRIVATE")
  const [graphJson, setGraphJson] = useState(storyGraphTemplateJson)
  const [graphResourceError, setGraphResourceError] = useState<string | null>(null)
  const [showFlowStudio, setShowFlowStudio] = useState(false)
  const [showSaveHint, setShowSaveHint] = useState(false)
  const saveButtonRef = useRef<HTMLButtonElement | null>(null)
  const [avatarForm, setAvatarForm] = useState<AvatarMetadata>(() => createAvatarMetadataTemplate())
  const [includeAvatar, setIncludeAvatar] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ slug: string | null; action: 'delete' | null }>({ slug: null, action: null })
  const [activeTab, setActiveTab] = useState("stories")

  // Media upload state
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const uploadedMediaRef = useRef<UploadedMedia[]>([])
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const avatarImageInputRef = useRef<HTMLInputElement>(null)
  const [avatarImageUploading, setAvatarImageUploading] = useState(false)
  const [avatarImageUploadError, setAvatarImageUploadError] = useState<string | null>(null)

  // Twine import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSlug, setImportSlug] = useState("")
  const [importTitle, setImportTitle] = useState("")
  const [importSummary, setImportSummary] = useState("")
  const [importTags, setImportTags] = useState("")
  const [importVisibility, setImportVisibility] = useState<"PRIVATE" | "UNLISTED" | "PUBLIC">("PRIVATE")
  const [importAvatarJson, setImportAvatarJson] = useState(avatarTemplateJson)
  const [importIncludeAvatar, setImportIncludeAvatar] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const importAvatarImageInputRef = useRef<HTMLInputElement>(null)
  const [importAvatarImageUploading, setImportAvatarImageUploading] = useState(false)
  const [importAvatarImageUploadError, setImportAvatarImageUploadError] = useState<string | null>(null)
  
  // Twine checklist state
  const [twineChecklistState, setTwineChecklistState] = useState<boolean[][]>(() =>
    twineChecklistSections.map((section) => section.items.map(() => false)),
  )

  // Walkthrough state
  const [showWelcome, setShowWelcome] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  const storiesErrorRef = useRef<HTMLParagraphElement | null>(null)
  const formErrorRef = useRef<HTMLParagraphElement | null>(null)
  const publishErrorRef = useRef<HTMLParagraphElement | null>(null)
  const importErrorRef = useRef<HTMLParagraphElement | null>(null)

  const [ownershipModalOpen, setOwnershipModalOpen] = useState(false)
  const [pendingPublishType, setPendingPublishType] = useState<"NEW" | "EXISTING" | null>(null)
  const [pendingStory, setPendingStory] = useState<CreatorStory | null>(null)
  const [ownershipAck, setOwnershipAck] = useState({ transfer: false, contact: false })
  const [ownershipConfirmLoading, setOwnershipConfirmLoading] = useState(false)
  const exampleProvisionAttemptedRef = useRef<string | null>(null)

  const scrollErrorIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) return
    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      element.focus({ preventScroll: true })
    })
  }, [])

  const isCreator = user?.role === "CREATOR" || user?.role === "ADMIN"
  const canSubmitStories = user?.permissions?.canSubmitStories ?? false
  const creatorStatus = user?.creatorProfile?.status ?? null

  const resetStoryFormToNew = useCallback(() => {
    setEditingStoryId(null)
    setSlug("")
    setTitle("New Story Title")
    setSummary("Short description of this journey.")
    setTags("community, empathy")
    setGraphJson(storyGraphTemplateJson)
    setAvatarForm(createAvatarMetadataTemplate())
    setIncludeAvatar(true)
    setUploadedMedia([])
    setFormError(null)
    setPublishError(null)
    setPublishSuccess(null)
    setMediaUploadError(null)
    setAvatarImageUploadError(null)
    setGraphResourceError(null)
  }, [])

  const handleTwineChecklistToggle = useCallback((sectionIndex: number, itemIndex: number, next: boolean) => {
    setTwineChecklistState((previous) =>
      previous.map((section, sIdx) =>
        sIdx === sectionIndex ? section.map((checked, itemIdx) => (itemIdx === itemIndex ? next : checked)) : section,
      ),
    )
  }, [])

  const resetOwnershipModal = useCallback(() => {
    setOwnershipAck({ transfer: false, contact: false })
    setPendingPublishType(null)
    setPendingStory(null)
  }, [])

  const resetTwineChecklist = useCallback(() => {
    setTwineChecklistState(twineChecklistSections.map((section) => section.items.map(() => false)))
  }, [])

  const handleDuplicateMedia = useCallback((id: string) => {
    const original = uploadedMedia.find(m => m.id === id)
    if (!original) return

    const duplicate: UploadedMedia = {
      ...original,
      id: `${original.id}-dup-${Date.now()}`,
      mappedToNode: undefined,  
    }

    setUploadedMedia(prev => [...prev, duplicate])
    
    toast({
      title: "Media duplicated",
      description: `Select a node for the duplicated ${original.name}`,
    })
  }, [uploadedMedia, toast])

  const updateAvatarFormImage = useCallback((imageUrl: string) => {
    setAvatarForm((previous) => ({
      ...previous,
      appearance: {
        ...previous.appearance,
        image: imageUrl,
      },
    }))
    setAvatarImageUploadError(null)
  }, [])

  const updateImportAvatarJsonImage = useCallback((imageUrl: string) => {
    try {
      const parsed = JSON.parse(importAvatarJson)
      const appearance = parsed?.appearance && typeof parsed.appearance === "object" ? parsed.appearance : {}
      const updated = {
        ...parsed,
        appearance: {
          ...appearance,
          image: imageUrl,
        },
      }
      setImportAvatarJson(JSON.stringify(updated, null, 2))
      setImportAvatarImageUploadError(null)
    } catch {
      setImportAvatarImageUploadError("Avatar JSON is invalid. Fix it before updating the profile image.")
    }
  }, [importAvatarJson])

  const updateGraphResource = useCallback((key: "money" | "time" | "health", rawValue: string) => {
    const numericValue = rawValue === "" ? 0 : Number(rawValue)
    if (!Number.isFinite(numericValue)) {
      setGraphResourceError("Resource values must be numbers.")
      return
    }

    try {
      const parsed = JSON.parse(graphJson)
      const initialResources =
        parsed?.initialResources && typeof parsed.initialResources === "object" ? parsed.initialResources : {}
      const updated = {
        ...parsed,
        initialResources: {
          ...initialResources,
          [key]: numericValue,
        },
      }
      setGraphJson(JSON.stringify(updated, null, 2))
      setGraphResourceError(null)
    } catch {
      setGraphResourceError("Story graph JSON is invalid. Fix it before editing resource amounts.")
    }
  }, [graphJson])

  const handleAvatarImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAvatarImageUploadError(null)

    const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
    if (!allowedImageTypes.includes(file.type)) {
      setAvatarImageUploadError(`Invalid image type: ${file.name}`)
      event.target.value = ""
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarImageUploadError(`File too large: ${file.name}`)
      event.target.value = ""
      return
    }

    setAvatarImageUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", "image")

    try {
      const res = await fetch("/api/creator/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setAvatarImageUploadError(data.error || "Failed to upload profile image.")
        return
      }

      updateAvatarFormImage(data.path)
      toast({
        title: "Profile image uploaded",
        description: "Saved to Cloudinary and linked to this character profile.",
      })
    } catch (error) {
      setAvatarImageUploadError(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setAvatarImageUploading(false)
      event.target.value = ""
    }
  }, [toast, updateAvatarFormImage])

  const handleImportAvatarImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportAvatarImageUploadError(null)

    const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
    if (!allowedImageTypes.includes(file.type)) {
      setImportAvatarImageUploadError(`Invalid image type: ${file.name}`)
      event.target.value = ""
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportAvatarImageUploadError(`File too large: ${file.name}`)
      event.target.value = ""
      return
    }

    setImportAvatarImageUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", "image")

    try {
      const res = await fetch("/api/creator/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setImportAvatarImageUploadError(data.error || "Failed to upload profile image.")
        return
      }

      updateImportAvatarJsonImage(data.path)
      toast({
        title: "Profile image uploaded",
        description: "Saved to Cloudinary and linked to this character profile.",
      })
    } catch (error) {
      setImportAvatarImageUploadError(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setImportAvatarImageUploading(false)
      event.target.value = ""
    }
  }, [toast, updateImportAvatarJsonImage])

  const updateAvatarRootField = useCallback(
    (key: "name" | "age" | "background" | "isPlayable", value: string | number | boolean | undefined) => {
      setAvatarForm((previous) => ({ ...previous, [key]: value }))
    },
    [],
  )

  const updateAvatarAppearanceField = useCallback(
    (
      key: "skinTone" | "hairColor" | "hairStyle" | "clothing" | "accessories" | "image",
      value: string | string[],
    ) => {
      setAvatarForm((previous) => ({
        ...previous,
        appearance: {
          ...previous.appearance,
          [key]: value,
        },
      }))
    },
    [],
  )

  const updateAvatarResourceField = useCallback(
    (key: "socialSupport" | "mentalHealth" | "physicalHealth", value: string) => {
      const parsedValue = value.trim() === "" ? undefined : Number(value)
      setAvatarForm((previous) => ({
        ...previous,
        initialResources: {
          ...previous.initialResources,
          [key]:
            typeof parsedValue === "number" && Number.isFinite(parsedValue)
              ? Math.max(0, Math.min(100, parsedValue))
              : undefined,
        },
      }))
    },
    [],
  )

  const updateAvatarSocialContextField = useCallback(
    (
      key:
        | "socioeconomicStatus"
        | "location"
        | "familyStructure"
        | "educationLevel"
        | "employmentStatus"
        | "healthConditions",
      value: string | string[],
    ) => {
      setAvatarForm((previous) => ({
        ...previous,
        socialContext: {
          ...(previous.socialContext ?? {}),
          [key]: value,
        },
      }))
    },
    [],
  )

  const parseCommaSeparatedList = useCallback((value: string) => {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }, [])

  // Media upload handlers
  const handleMediaUpload = useCallback(async (files: FileList | null, type: "image" | "audio") => {
    if (!files || files.length === 0) return
    setMediaUploadError(null)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
      const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"]
      const allowedTypes = type === "image" ? allowedImageTypes : allowedAudioTypes

      if (!allowedTypes.includes(file.type)) {
        setMediaUploadError(`Invalid file type: ${file.name}`)
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        setMediaUploadError(`File too large: ${file.name}`)
        continue
      }

      // Add to uploadedMedia state
      setUploadedMedia(prev => [...prev, {
        id: `${Date.now()}-${i}`,
        file,  
        name: file.name,
        type,
        url: URL.createObjectURL(file),
        cropPreview: type === "image" ? createDefaultCropPreview() : undefined,
      }])
    }
  }, [])

  const handleRemoveMedia = useCallback((id: string) => {
    const item = uploadedMedia.find(m => m.id === id)
    if (!item) return

    if (item.file) {
      URL.revokeObjectURL(item.url)
    }

    // Remove from uploadedMedia state
    setUploadedMedia(prev => prev.filter(m => m.id !== id))

    try {
      const parsed = JSON.parse(graphJson)
      if (parsed && Array.isArray(parsed.nodes)) {
        let modified = false
        const imagePath = item.serverPath || `/scenes/${item.name}`
        const audioPath = item.serverPath || `/audio/${item.name}`

        const updatedNodes = parsed.nodes.map((node: any) => {
          if (!node.media) return node

          const newMedia = { ...node.media }
          
          // Remove image reference if it matches
          if (item.type === "image" && (newMedia.image === imagePath || newMedia.image === `/scenes/${item.name}`)) {
            delete newMedia.image
            modified = true
          }
          
          // Remove audio reference if it matches
          if (item.type === "audio" && (newMedia.audio === audioPath || newMedia.audio === `/audio/${item.name}`)) {
            delete newMedia.audio
            modified = true
          }

          // If media object is now empty, remove it entirely
          if (Object.keys(newMedia).length === 0) {
            const { media, ...nodeWithoutMedia } = node
            return nodeWithoutMedia
          }

          return { ...node, media: newMedia }
        })

        if (modified) {
          setGraphJson(JSON.stringify({ ...parsed, nodes: updatedNodes }, null, 2))
          toast({
            title: "Media removed",
            description: `Removed ${item.name} from library and story graph.`,
          })
        }
      }
    } catch {
      // Ignore JSON parse errors here
    }
  }, [uploadedMedia, graphJson, toast])

  const handleMediaNameChange = useCallback((id: string, newName: string) => {
    setUploadedMedia(prev => prev.map(m => 
      m.id === id ? { ...m, name: newName } : m
    ))
  }, [])

  const handleMediaCropPreviewChange = useCallback(
    (id: string, key: "x" | "y" | "zoom", value: number) => {
      setUploadedMedia((prev) =>
        prev.map((media) => {
          if (media.id !== id || media.type !== "image") return media
          const current = media.cropPreview ?? createDefaultCropPreview()
          return {
            ...media,
            cropPreview: {
              ...current,
              [key]: value,
            },
          }
        }),
      )
    },
    [],
  )

  const handleMediaNodeMapping = useCallback((id: string, nodeKey: string) => {
    setUploadedMedia(prev => prev.map(m => 
      m.id === id ? { ...m, mappedToNode: nodeKey || undefined } : m
    ))
  }, [])

  const applyMediaMappingsToGraph = useCallback(async () => {

    // Avoid no media upload
    if (uploadedMedia.length === 0) {
      toast({
        variant: "destructive", 
        title: "No media to apply",
        description: "Upload some images or audio files first.",
      })
      return
    }

    // Media is only accepted with a selected node
    const unmappedMedia = uploadedMedia.filter(m => {
      const node = m.mappedToNode
      const isMapped = node && node.trim() !== "" && node !== "undefined"
      return !isMapped
    })

    if (unmappedMedia.length > 0) {      
      toast({
        variant: "destructive",
        title: "Select nodes first",
        description: `Please select a node for: ${unmappedMedia.map(m => m.name).join(", ")}`,
        duration: 5000,  // 5 seconds
      })
      
        // Also set the mediaUploadError state for a persistent message
        setMediaUploadError(`Please select a node for each file before applying: ${unmappedMedia.map(m => m.name).join(", ")}`)
      
      return
    }

    // Check for valid graph JSON
    let parsed: any
    try {
      parsed = JSON.parse(graphJson)
      if (!parsed || !Array.isArray(parsed.nodes)) {
        toast({
          variant: "destructive",
          title: "Invalid graph",
          description: "Cannot parse story graph JSON.",
        })
        return
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "JSON Error",
        description: "Fix the story graph JSON before applying media mappings.",
      })
      return
    }

    // Upload files
    const filesToUpload = uploadedMedia.filter(m => m.file && !m.serverPath)
    const updatedMediaList = [...uploadedMedia]
    
    if (filesToUpload.length > 0) {
      toast({
        title: "Uploading files...",
        description: `Uploading ${filesToUpload.length} file(s) to server.`,
      })

      for (const media of filesToUpload) {
        if (!media.file) continue
        
        const formData = new FormData()
        formData.append("file", media.file)
        formData.append("type", media.type)

        try {
          const res = await fetch("/api/creator/upload", {
            method: "POST",
            credentials: "include",
            body: formData,
          })
          const data = await res.json()

          if (!res.ok) {
            toast({
              variant: "destructive",
              title: "Upload failed",
              description: data.error || `Failed to upload ${media.name}`,
            })
            return
          }

          const idx = updatedMediaList.findIndex(m => m.id === media.id)
          if (idx !== -1) {
            updatedMediaList[idx] = { 
              ...updatedMediaList[idx], 
              name: data.filename, 
              serverPath: data.path 
            }
          }
        } catch (err) {
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: `Failed to upload ${media.name}`,
          })
          return
        }
      }

      setUploadedMedia(updatedMediaList)
    }

    // Apply mappings    
    const globalAudio = updatedMediaList.find(m => m.type === "audio" && m.mappedToNode === "__ALL_NODES__")
    let imageCount = 0
    let audioCount = 0

    const updatedNodes = parsed.nodes.map((node: any) => {
      const mappedImage = updatedMediaList.find(m => m.type === "image" && m.mappedToNode === node.key)
      const mappedAudio = updatedMediaList.find(m => m.type === "audio" && m.mappedToNode === node.key)
      
      const audioToUse = mappedAudio || globalAudio
      
      if (!mappedImage && !audioToUse) return node

      const media = node.media && typeof node.media === "object" ? { ...node.media } : {}
      
      if (mappedImage) {
        media.image = mappedImage.serverPath 
        imageCount++
      }
      if (audioToUse) {
        media.audio = audioToUse.serverPath 
        audioCount++
      }

      return { ...node, media }
    })

    setGraphJson(JSON.stringify({ ...parsed, nodes: updatedNodes }, null, 2))
    
    const parts = []
    if (imageCount > 0) parts.push(`${imageCount} image(s)`)
    if (globalAudio) {
      parts.push(`background audio to all ${parsed.nodes.length} nodes`)
    } else if (audioCount > 0) {
      parts.push(`${audioCount} audio file(s)`)
    }

    // At the end of successful apply no error
    setMediaUploadError(null)  
    toast({
      title: "Media applied to graph!",
      description: `Applied ${parts.join(" and ")}. Save your story to persist changes.`,
      duration: 5000,
    })
  }, [graphJson, uploadedMedia, toast])

  const handleFlowStudioMediaUpload = useCallback(
    (item: { name: string; type: "image" | "audio"; url: string; serverPath: string; mappedToNode?: string }) => {
      setUploadedMedia((prev) => {
        const alreadyAdded = prev.some(
          (media) => media.serverPath === item.serverPath && media.mappedToNode === item.mappedToNode,
        )
        if (alreadyAdded) return prev
        return [
          ...prev,
          {
            id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: item.name,
            type: item.type,
            url: item.url,
            serverPath: item.serverPath,
            mappedToNode: item.mappedToNode,
            cropPreview: item.type === "image" ? createDefaultCropPreview() : undefined,
          },
        ]
      })
    },
    [],
  )

  const handleFlowStudioDone = useCallback(() => {
    setShowFlowStudio(false)
    setActiveTab("new")
    setShowSaveHint(true)
    requestAnimationFrame(() => {
      saveButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      saveButtonRef.current?.focus({ preventScroll: true })
    })
  }, [])

  // Walkthrough handlers
  const handleStartWalkthrough = () => {
    setShowWelcome(false)
    setShowWalkthrough(true)
  }

  const handleSkipWalkthrough = () => {
    setShowWelcome(false)
    localStorage.setItem("creator-walkthrough-completed", "true")
  }

  const handleCompleteWalkthrough = () => {
    setShowWalkthrough(false)
    localStorage.setItem("creator-walkthrough-completed", "true")
  }

  const handleRestartWalkthrough = () => {
    setShowWelcome(true)
  }

  useEffect(() => {
    if (!isCreator || loading) return
    
    const walkthroughParam = searchParams.get("walkthrough")
    const hasSeenWalkthrough = localStorage.getItem("creator-walkthrough-completed")
    
    if (walkthroughParam === "true" || !hasSeenWalkthrough) {
      const timer = setTimeout(() => {
        setShowWelcome(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isCreator, loading, searchParams])

  const normalizedStoryCode = useMemo(() => normalizeSlug(slug), [slug])
  const conflictingStoryForCode = useMemo(() => {
    if (!normalizedStoryCode) return null
    return stories.find((story) => story.slug === normalizedStoryCode && story.id !== editingStoryId) ?? null
  }, [stories, normalizedStoryCode, editingStoryId])
  const hasExampleStory = useMemo(() => {
    const example = stories.find((story) => story.slug === exampleStory.slug)
    if (!example) return false
    const hasTag = Array.isArray(example.tags) && example.tags.includes(exampleStory.tag)
    return (
      example.title === exampleStory.title &&
      example.summary === exampleStory.summary &&
      hasTag &&
      example.createdAt === example.updatedAt
    )
  }, [stories])
  const parsedGraph = useMemo(() => {
    try {
      const parsed = JSON.parse(graphJson)
      return parsed && typeof parsed === "object" ? parsed : null
    } catch {
      return null
    }
  }, [graphJson])
  const storyCodeConflictMessage = conflictingStoryForCode
    ? `Story code already belongs to "${conflictingStoryForCode.title}". Please choose a different code.`
    : null
  const hasStoryCodeConflict = Boolean(storyCodeConflictMessage)

  const nodeKeys: NodeKeyInfo[] = useMemo(() => {
    if (!parsedGraph || !Array.isArray(parsedGraph.nodes)) return []
    return parsedGraph.nodes.map((n: { key: string; title?: string }) => ({
      key: n.key,
      title: n.title || n.key
    }))
  }, [parsedGraph])

  const fetchStoriesFromApi = useCallback(async (): Promise<CreatorStory[]> => {
    const response = await fetch("/api/creator/stories", {
      cache: "no-store",
      credentials: "include",
    })

    let data: any = null
    try {
      data = await response.json()
    } catch (error) {
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }
      return []
    }

    if (!response.ok) {
      const message = data?.error ?? `Request failed (${response.status})`
      throw new Error(message)
    }

    if (!Array.isArray(data?.stories)) {
      return []
    }

    return data.stories as CreatorStory[]
  }, [])

  const refreshStories = useCallback(async () => {
    try {
      const latest = await fetchStoriesFromApi()
      setStories(latest)
      setFetchError(null)
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unable to load stories.")
      throw error
    }
  }, [fetchStoriesFromApi])

  useEffect(() => {
    if (!isCreator) return
    let cancelled = false
    setFetchError(null)
    setStoriesMessage(null)
    ;(async () => {
      try {
        const data = await fetchStoriesFromApi()
        if (!cancelled) {
          setStories(data)
        }
      } catch (error) {
        if (!cancelled) {
          setFetchError(error instanceof Error ? error.message : "Unable to load stories.")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fetchStoriesFromApi, isCreator])

  useEffect(() => {
    if (!user?.id) return
    exampleProvisionAttemptedRef.current = null
  }, [user?.id])

  useEffect(() => {
    if (!isCreator || loading || !user?.id) return
    const storageKey = `creator-example-provisioned:${user.id}`
    const hasStarterStory = stories.some((story) => story.slug === exampleStory.slug)

    if (hasStarterStory) {
      localStorage.setItem(storageKey, "true")
      return
    }

    if (stories.length > 0) return
    if (fetchError) return
    if (localStorage.getItem(storageKey) === "true") return
    if (exampleProvisionAttemptedRef.current === user.id) return

    exampleProvisionAttemptedRef.current = user.id

    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch("/api/creator/upgrade", {
          method: "POST",
          credentials: "include",
        })

        if (!response.ok) {
          return
        }

        await refreshStories()
        if (!cancelled) {
          localStorage.setItem(storageKey, "true")
        }
      } catch (error) {
        console.error("[creator-dashboard] Failed to provision example story:", error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fetchError, isCreator, loading, refreshStories, stories, user?.id])

  useEffect(() => {
    if (!storiesMessage) return
    const stickyMessages = new Set([
      "Complete your creator profile before submitting stories for approval.",
    ])
    if (stickyMessages.has(storiesMessage)) {
      return
    }
    const timeout = setTimeout(() => setStoriesMessage(null), 6000)
    return () => clearTimeout(timeout)
  }, [storiesMessage])

  useEffect(() => {
    if (!publishSuccess) return
    const timeout = setTimeout(() => setPublishSuccess(null), 6000)
    return () => clearTimeout(timeout)
  }, [publishSuccess])

  useEffect(() => {
    if (!importSuccess) return
    const timeout = setTimeout(() => setImportSuccess(null), 6000)
    return () => clearTimeout(timeout)
  }, [importSuccess])

  useEffect(() => {
    if (fetchError) scrollErrorIntoView(storiesErrorRef.current)
  }, [fetchError, scrollErrorIntoView])

  useEffect(() => {
    if (formError) scrollErrorIntoView(formErrorRef.current)
  }, [formError, scrollErrorIntoView])

  useEffect(() => {
    if (publishError) scrollErrorIntoView(publishErrorRef.current)
  }, [publishError, scrollErrorIntoView])

  useEffect(() => {
    if (importError) scrollErrorIntoView(importErrorRef.current)
  }, [importError, scrollErrorIntoView])

  // Cleanup object URLs on unmount
  useEffect(() => {
    uploadedMediaRef.current = uploadedMedia
  }, [uploadedMedia])

  useEffect(() => {
    return () => {
      uploadedMediaRef.current.forEach((media) => URL.revokeObjectURL(media.url))
    }
  }, [])

  const populateFormFromStory = (story: CreatorStory) => {
    setSlug(story.slug)
    setTitle(story.title)
    setSummary(story.summary ?? "")
    setTags(story.tags.join(", "))
    setVisibility((story.visibility as "PRIVATE" | "UNLISTED" | "PUBLIC") ?? "PRIVATE")
    const graphPayload: Record<string, unknown> = {
      nodes: story.nodes,
      paths: story.paths,
      transitions: story.transitions,
    }
    if (story.metadata?.avatar?.initialResources) {
      const resources = story.metadata.avatar.initialResources as Record<string, unknown>
      graphPayload.initialResources = {
        money: typeof resources.money === "number" ? resources.money : 0,
        time: typeof resources.time === "number" ? resources.time : 0,
        health: typeof resources.health === "number" ? resources.health : 100,
      }
    }
    setGraphJson(JSON.stringify(graphPayload, null, 2))
    if (story.metadata?.avatar) {
      setAvatarForm(normalizeAvatarMetadata(story.metadata.avatar))
      setIncludeAvatar(true)
    } else {
      setAvatarForm(createAvatarMetadataTemplate())
      setIncludeAvatar(false)
    }

    // Extract existing media from story nodes
    const existingMedia: UploadedMedia[] = []
    const seenPaths = new Set<string>()

    // Helper to check if path is valid 
    const isValidMediaPath = (path: string | undefined): path is string => {
      if (!path) return false
      return (
        path.startsWith("/scenes/") ||
        path.startsWith("/audio/") ||
        path.includes("cloudinary.com") ||
        path.includes("res.cloudinary.com") ||
        path.startsWith("http://") ||
        path.startsWith("https://")
      )
    }

    // Helper to extract filename from path or URL
    const extractFilename = (path: string): string => {
      if (path.includes("cloudinary.com") || path.includes("res.cloudinary.com")) {
        const parts = path.split("/")
        const lastPart = parts[parts.length - 1]
        return lastPart.replace(/-\d{10,}\.\w+$/, "").replace(/\.\w+$/, "") || lastPart
      }
      return path.split("/").pop() || path
    }

    story.nodes.forEach((node) => {
      // Extract images 
      const imagePath = node.media?.image || node.media?.visual
      if (isValidMediaPath(imagePath) && !seenPaths.has(imagePath)) {
        seenPaths.add(imagePath)
        const mediaItem = {
          id: `existing-img-${node.key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: extractFilename(imagePath),
          type: "image" as const,
          url: imagePath,
          serverPath: imagePath,
          mappedToNode: node.key,
          cropPreview: createDefaultCropPreview(),
        }
        existingMedia.push(mediaItem)
      }

      // Extract audio
      const audioPath = node.media?.audio
      if (isValidMediaPath(audioPath) && !seenPaths.has(audioPath)) {
        seenPaths.add(audioPath)
        const mediaItem = {
          id: `existing-audio-${node.key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: extractFilename(audioPath),
          type: "audio" as const,
          url: audioPath,
          serverPath: audioPath,
          mappedToNode: node.key,
        }
        existingMedia.push(mediaItem)
      }
    })

    setUploadedMedia(existingMedia)
    setFormError(null)
    setPublishError(null)
    setPublishSuccess(null)
  }

  const handleCreateStory = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setStoriesMessage(null)
    setCreating(true)
    try {
      let graph: { nodes: unknown; paths: unknown; transitions: unknown }
      try {
        graph = JSON.parse(graphJson)
      } catch (parseError) {
        throw new Error("Story graph JSON is invalid. Please ensure it is valid JSON.")
      }

      const validation = validateGraph(graph)
      if (!validation.ok) {
        throw new Error(validation.message)
      }

      const graphInitialResources = extractGraphInitialResources(graph)

      let avatarMetadata: AvatarMetadata | undefined
      if (includeAvatar) {
        avatarMetadata = applyGraphInitialResourcesToAvatar(normalizeAvatarMetadata(avatarForm), graphInitialResources)
        const avatarValidation = validateAvatarMetadata(avatarMetadata)
        if (!avatarValidation.ok) {
          throw new Error(avatarValidation.message)
        }
      }

      const normalized = normalizeSlug(slug)
      if (!normalized) {
        throw new Error("Story code is required and must use letters, numbers, or dashes.")
      }

      const conflictingStory = stories.find((story) => story.slug === normalized && story.id !== editingStoryId)
      if (conflictingStory) {
        throw new Error(`Story code already belongs to "${conflictingStory.title}". Please choose a different code.`)
      }

      const payload = {
        slug: normalized,
        title,
        summary,
        tags: parseTagsString(tags),
        visibility,
        nodes: graph.nodes,
        paths: graph.paths,
        transitions: graph.transitions,
        metadata: avatarMetadata ? { avatar: avatarMetadata } : undefined,
      }

      const isEditing = Boolean(editingStoryId)
      const requestBody = isEditing ? { ...payload, storyId: editingStoryId! } : payload

      const response = await fetch("/api/creator/stories", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : null
      if (!response.ok) {
        throw new Error((data && data.error) || raw || "Unable to save story.")
      }

      if (isEditing) {
        setSlug(payload.slug)
      } else {
        setEditingStoryId(null)
        setSlug("")
        setTitle("New Story Title")
        setSummary("Short description of this journey.")
        setTags("community, empathy")
        setGraphJson(storyGraphTemplateJson)
        setAvatarForm(createAvatarMetadataTemplate())
        setIncludeAvatar(true)
        setFormError(null)
        setPublishError(null)
        setPublishSuccess(null)
        setMediaUploadError(null)
        setGraphResourceError(null)
      }

      try {
        await refreshStories()
        setStoriesMessage(isEditing ? "Story updated successfully." : "Story saved successfully.")
      } catch {
        // refreshStories already updates fetchError
      }

      setActiveTab("stories")
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save story.")
    } finally {
      setCreating(false)
    }
  }

  const submitNewStoryForApproval = async (ownership: { transfer: boolean; contact: boolean }) => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!ownership.transfer || !ownership.contact) {
      setPublishError("Please confirm the ownership acknowledgements before submitting.")
      return
    }

    setPublishError(null)
    setPublishSuccess(null)
    setStoriesMessage(null)
    setPublishing(true)
    
    try {
      // Validate graph
      let graph: { nodes: unknown; paths: unknown; transitions: unknown }
      try {
        graph = JSON.parse(graphJson)
      } catch (parseError) {
        throw new Error("Story graph JSON is invalid. Please ensure it is valid JSON.")
      }

      const validation = validateGraph(graph)
      if (!validation.ok) {
        throw new Error(validation.message)
      }

      const graphInitialResources = extractGraphInitialResources(graph)

      // Validate avatar if included
      let avatarMetadata: AvatarMetadata | undefined
      if (includeAvatar) {
        avatarMetadata = applyGraphInitialResourcesToAvatar(normalizeAvatarMetadata(avatarForm), graphInitialResources)
        const avatarValidation = validateAvatarMetadata(avatarMetadata)
        if (!avatarValidation.ok) {
          throw new Error(avatarValidation.message)
        }
      }

      // Validate slug
      const normalized = normalizeSlug(slug)
      if (!normalized) {
        throw new Error("Story code is required and must use letters, numbers, or dashes.")
      }

      const conflictingStory = stories.find((story) => story.slug === normalized && story.id !== editingStoryId)
      if (conflictingStory) {
        throw new Error(`Story code already belongs to "${conflictingStory.title}". Please choose a different code.`)
      }

      // Build payload
      const payload = {
        slug: normalized,
        title,
        summary,
        tags: parseTagsString(tags),
        visibility,
        nodes: graph.nodes,
        paths: graph.paths,
        transitions: graph.transitions,
        metadata: avatarMetadata ? { avatar: avatarMetadata } : undefined,
      }

      const isEditing = Boolean(editingStoryId)
      const requestBody = isEditing ? { ...payload, storyId: editingStoryId! } : payload

      const saveResponse = await fetch("/api/creator/stories", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })
      const saveRaw = await saveResponse.text()
      const saveData = saveRaw ? JSON.parse(saveRaw) : null
      if (!saveResponse.ok) {
        throw new Error((saveData && saveData.error) || saveRaw || "Unable to save story before publishing.")
      }

      if (isEditing) {
        setSlug(payload.slug)
      }

      const publishResponse = await fetch("/api/creator/stories/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: normalized,
          ownershipAcknowledgement: ownership,
        }),
      })
      const publishRaw = await publishResponse.text()
      const publishData = publishRaw ? JSON.parse(publishRaw) : null
      if (!publishResponse.ok) {
        throw new Error((publishData && publishData.error) || publishRaw || "Unable to submit for approval.")
      }

      let emailSent = false
      try {
        const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
        const templateId = process.env.NEXT_PUBLIC_EMAILJS_ADMIN_TEMPLATE_ID
        const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_APPROVAL_EMAIL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

        if (serviceId && templateId && publicKey && adminEmail) {
          const storyUrl = `${baseUrl}/creator/preview/${normalized}`
          const approveUrl = `${baseUrl}/admin?action=approve&versionId=${publishData.versionId}`
          const rejectUrl = `${baseUrl}/admin?action=reject&versionId=${publishData.versionId}`

          await emailjs.send(serviceId, templateId, {
            to_email: adminEmail,
            story_url: storyUrl,
            story_title: title,
            story_slug: normalized,
            version_number: publishData.versionId ? "1" : "1",
            submitter_username: user.username || user.email?.split("@")[0] || "Unknown",
            submitter_email: user.email || "unknown@loop.app",
            approve_url: approveUrl,
            reject_url: rejectUrl,
          }, publicKey)
          
          emailSent = true
        }
      } catch (emailErr) {
        console.warn("Admin notification email failed:", emailErr)
      }

      if (emailSent) {
        setPublishSuccess("Submitted for approval. An admin has been notified.")
      } else {
        setPublishSuccess("Submitted for approval, but the notification email could not be sent.")
      }

      try {
        await refreshStories()
      } catch {}
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Unable to submit for approval.")
    } finally {
      setPublishing(false)
    }
  }

  const submitExistingStoryForApproval = async (
    story: CreatorStory,
    ownership: { transfer: boolean; contact: boolean },
  ) => {

    if (!user) {
      router.push("/login")
      return
    }

    if (!ownership.transfer || !ownership.contact) {
      setFetchError("Please confirm the ownership acknowledgements before submitting.")
      return
    }

    setStoriesMessage(null)
    setFetchError(null)
    setPublishingSlug(story.slug)

    try {
      const publishResponse = await fetch("/api/creator/stories/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: story.slug,
          ownershipAcknowledgement: ownership,
        }),
      })
      const publishRaw = await publishResponse.text()
      const publishData = publishRaw ? JSON.parse(publishRaw) : null
      if (!publishResponse.ok) {
        throw new Error((publishData && publishData.error) || publishRaw || "Unable to submit for approval.")
      }

      // Send admin notification email from browser
      let emailSent = false
      try {
        const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
        const templateId = process.env.NEXT_PUBLIC_EMAILJS_ADMIN_TEMPLATE_ID
        const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_APPROVAL_EMAIL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

        if (serviceId && templateId && publicKey && adminEmail) {
          const storyUrl = `${baseUrl}/creator/preview/${story.slug}`
          const approveUrl = `${baseUrl}/admin?action=approve&versionId=${publishData.versionId}`
          const rejectUrl = `${baseUrl}/admin?action=reject&versionId=${publishData.versionId}`

          await emailjs.send(serviceId, templateId, {
            to_email: adminEmail,
            story_url: storyUrl,
            story_title: story.title,
            story_slug: story.slug,
            version_number: publishData.versionNumber || "1",
            submitter_username: user.username || user.email?.split("@")[0] || "Unknown",
            submitter_email: user.email || "unknown@loop.app",
            approve_url: approveUrl,
            reject_url: rejectUrl,
          }, publicKey)
          
          emailSent = true
        }
      } catch (emailErr) {
        console.warn("Admin notification email failed:", emailErr)
      }

      try {
        await refreshStories()
      } catch {}

      if (emailSent) {
        setStoriesMessage(`"${story.title}" submitted for approval. An admin has been notified.`)
      } else {
        setStoriesMessage(`"${story.title}" submitted for approval, but the notification email could not be sent.`)
      }
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unable to submit story for approval.")
    } finally {
      setPublishingSlug(null)
    }
  }

  const requestPublishNewStory = () => {
    if (!canSubmitStories) {
      setPublishError("Complete your creator profile before submitting stories for approval.")
      router.push("/profile#creator")
      return
    }

    setPublishError(null)
    setPublishSuccess(null)
    setStoriesMessage(null)
    setOwnershipAck({ transfer: false, contact: false })
    setPendingPublishType("NEW")
    setPendingStory(null)
    setOwnershipModalOpen(true)
  }

  const requestPublishExistingStory = (story: CreatorStory) => {
    if (!canSubmitStories) {
      setStoriesMessage("Complete your creator profile before submitting stories for approval.")
      router.push("/profile#creator")
      return
    }

    setOwnershipAck({ transfer: false, contact: false })
    setPendingPublishType("EXISTING")
    setPendingStory(story)
    setOwnershipModalOpen(true)
  }

  const handleOwnershipConfirm = async () => {
    if (!pendingPublishType) {
      setOwnershipModalOpen(false)
      resetOwnershipModal()
      return
    }

    setOwnershipConfirmLoading(true)
    try {
      if (pendingPublishType === "NEW") {
        await submitNewStoryForApproval(ownershipAck)
      } else if (pendingPublishType === "EXISTING" && pendingStory) {
        await submitExistingStoryForApproval(pendingStory, ownershipAck)
      }
      setOwnershipModalOpen(false)
      resetOwnershipModal()
    } catch (error) {
      console.error("[creator-dashboard] Ownership confirmation failed:", error)
    } finally {
      setOwnershipConfirmLoading(false)
    }
  }

  const handleDeleteStory = (storySlug: string) => {
    setConfirmDialog({ slug: storySlug, action: 'delete' })
  }

  const confirmDeleteStory = async () => {
    if (!confirmDialog.slug) return
    const targetSlug = confirmDialog.slug
    setDeletingSlug(targetSlug)
    setStoriesMessage(null)
    setFetchError(null)
    setConfirmDialog({ slug: null, action: null })
    try {
      const response = await fetch("/api/creator/stories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: targetSlug }),
      })
      if (!response.ok && response.status !== 204) {
        const raw = await response.text()
        const data = raw ? JSON.parse(raw) : null
        throw new Error((data && data.error) || raw || "Unable to delete story.")
      }
      if (targetSlug === exampleStory.slug && user?.id) {
        localStorage.setItem(`creator-example-provisioned:${user.id}`, "true")
      }
      try {
        await refreshStories()
        setStoriesMessage("Story deleted successfully.")
      } catch {}
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unable to delete story.")
    } finally {
      setDeletingSlug(null)
    }
  }

  const handleEditStory = (story: CreatorStory) => {
    setEditingStoryId(story.id)
    populateFormFromStory(story)
    setStoriesMessage(null)
    setActiveTab("new")
  }

  const handleImportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setImportError(null)
    setImportSuccess(null)

    if (!importFile) {
      setImportError("Select a Twine .zip or .json file to import.")
      return
    }

    let avatarMetadata: AvatarMetadata | undefined
    if (importIncludeAvatar) {
      try {
        avatarMetadata = JSON.parse(importAvatarJson)
      } catch (parseError) {
        setImportError("Avatar metadata JSON is invalid. Please ensure it is valid JSON.")
        return
      }
      const avatarValidation = validateAvatarMetadata(avatarMetadata)
      if (!avatarValidation.ok) {
        setImportError(avatarValidation.message)
        return
      }
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("twineFile", importFile)
      const overrides = {
        slug: importSlug.trim() || undefined,
        title: importTitle.trim() || undefined,
        summary: importSummary.trim() || undefined,
        tags: parseTagsString(importTags),
        visibility: importVisibility,
        avatar: avatarMetadata,
      }
      formData.append("overrides", JSON.stringify(overrides))

      const response = await fetch("/api/creator/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : null
      if (!response.ok) {
        throw new Error((data && data.error) || raw || "Unable to import Twine story.")
      }

      setImportSuccess(`Imported "${data?.title ?? data?.slug}" successfully.`)
      setStoriesMessage("Imported story and synchronized graph from Twine export.")
      setImportFile(null)
      setImportSlug("")
      setImportTitle("")
      setImportSummary("")
      setImportTags("")
      setImportAvatarJson(avatarTemplateJson)
      setImportIncludeAvatar(true)
      setImportAvatarImageUploadError(null)

      try {
        await refreshStories()
      } catch {}

      setActiveTab("stories")
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import Twine story.")
    } finally {
      setImporting(false)
    }
  }

  const storiesPreview = useMemo(
    () =>
      stories.map((story) => ({
        ...story,
        decisionCount: story.nodes.filter((n) => n.type === "DECISION").length,
        hasAvatar: Boolean(story.metadata?.avatar),
        avatarImage: story.metadata?.avatar?.appearance?.image,
      })),
    [stories],
  )

  const avatarImagePreview = includeAvatar ? avatarForm.appearance?.image ?? "" : ""

  const importAvatarImagePreview = useMemo(() => {
    if (!importIncludeAvatar) return ""
    try {
      const parsed = JSON.parse(importAvatarJson)
      const image = parsed?.appearance?.image
      return typeof image === "string" ? image : ""
    } catch {
      return ""
    }
  }, [importAvatarJson, importIncludeAvatar])

  const graphResourceValues = useMemo(() => {
    try {
      const parsed = JSON.parse(graphJson)
      const resources = parsed?.initialResources ?? {}
      return {
        money: typeof resources.money === "number" ? resources.money : "",
        time: typeof resources.time === "number" ? resources.time : "",
        health: typeof resources.health === "number" ? resources.health : "",
      }
    } catch {
      return { money: "", time: "", health: "" }
    }
  }, [graphJson])

  // Helper to validate image path
  const getStoryImage = (story: typeof storiesPreview[0]): string | null => {
    const imagePath = story.avatarImage
    if (imagePath && (
      imagePath.startsWith("/scenes/") ||
      imagePath.includes("cloudinary.com") ||
      imagePath.includes("res.cloudinary.com")
    )) {
      return imagePath
    }
    return null
  }

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingContent>
          <LoadingDot />
          <LoadingText>Loading creator dashboard…</LoadingText>
        </LoadingContent>
      </LoadingContainer>
    )
  }

  if (!user) {
    return (
      <PageContainer>
        <UnauthContainer>
          <BackLink href="/">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back home
          </BackLink>
          <UnauthCard>
            <UnauthTitle>Creator Tools</UnauthTitle>
            <UnauthText>Sign in to manage stories, publish journeys, and request moderation.</UnauthText>
            <UnauthButtons>
              <Button $variant="outline" onClick={() => router.push("/login")}>Sign in</Button>
              <Button onClick={() => router.push("/register")}>Create account</Button>
            </UnauthButtons>
          </UnauthCard>
        </UnauthContainer>
      </PageContainer>
    )
  }

  if (!isCreator) {
    return (
      <PageContainer>
        <UnauthContainer>
          <ButtonLink href="/" $variant="ghost">← Back home</ButtonLink>
          <Card>
            <CardHeader>
              <CardTitle>Become a Creator</CardTitle>
              <CardDescription>Upgrade your account to submit stories.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/creator/upgrade", { method: "POST", credentials: "include" })
                    if (!response.ok) throw new Error("Unable to upgrade.")
                    toast({ title: "Creator access unlocked" })
                    await refresh()
                    router.refresh()
                  } catch (error) {
                    toast({ variant: "destructive", title: "Upgrade failed" })
                  }
                }}
              >
                Upgrade my account
              </Button>
            </CardContent>
          </Card>
        </UnauthContainer>
      </PageContainer>
    )
  }

  if (showFlowStudio) {
    return (
      <FlowStudioPage
        graphJson={graphJson}
        onGraphJsonChange={setGraphJson}
        storyTitle={title}
        onClose={() => setShowFlowStudio(false)}
        onMediaUploaded={handleFlowStudioMediaUpload}
        onDone={handleFlowStudioDone}
      />
    )
  }

  return (
    <PageContainer>
      <AppHeader />
      
      <MainContent>
        <HeaderRow>
          <PageTitle>Creator Tools</PageTitle>
          <HeaderActions>
            <Button $variant="outline" $size="sm" onClick={handleRestartWalkthrough}>
              Tutorial Tour
            </Button>
            <ButtonLink href="/" $variant="outline">Back to Home</ButtonLink>
          </HeaderActions>
        </HeaderRow>

        {(creatorStatus !== "ACTIVE") && (
          <WarningBanner>
            <WarningText>Finish your creator profile before submitting stories for approval.</WarningText>
            <WarningButtonLink href="/profile#creator" $variant="outline">
              Update creator profile
            </WarningButtonLink>
          </WarningBanner>
        )}

        <TabsContainer>
          <TabsList>
            <TabTrigger $active={activeTab === "stories"} onClick={() => setActiveTab("stories")} data-walkthrough="tab-stories">
              My Stories
            </TabTrigger>
            <TabTrigger $active={activeTab === "new"} onClick={() => setActiveTab("new")} data-walkthrough="tab-new">
              Create / Update Story
            </TabTrigger>
            <TabTrigger $active={activeTab === "import"} onClick={() => setActiveTab("import")} data-walkthrough="tab-import">
              Import from Twine
            </TabTrigger>
          </TabsList>

          {activeTab === "stories" && (
            <TabContent>
              {storiesMessage && <SuccessMessage>{storiesMessage}</SuccessMessage>}
              {fetchError && <ErrorMessage ref={storiesErrorRef} tabIndex={-1}>{fetchError}</ErrorMessage>}

              {storiesPreview.length === 0 ? (
                <EmptyState>
                  <EmptyIcon><BookOpen size={40} /></EmptyIcon>
                  <EmptyTitle>No Stories Yet</EmptyTitle>
                  <EmptyText>Start creating immersive journeys.</EmptyText>
                </EmptyState>
              ) : (
                <StoriesGrid>
                  {storiesPreview.map((story) => {
                    const storyImage = getStoryImage(story)
                    const isExampleStory = story.slug === "my-first-story"
                    return (
                      <StoryCard key={story.id} {...(isExampleStory ? { "data-walkthrough": "example-story-card" } : {})}>
                        <StoryHeader>
                          <StoryAvatar>
                            <StoryAvatarFallback aria-hidden>
                              <BookOpen size={20} />
                            </StoryAvatarFallback>
                            {storyImage && (
                              <StoryAvatarImage
                                src={storyImage}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                            )}
                          </StoryAvatar>
                          <StoryInfo>
                            <StoryTitle>
                              {story.title}
                              {isExampleStory && <ExampleBadge>Example</ExampleBadge>}
                            </StoryTitle>
                            {story.hasAvatar && <StoryMeta>Has character profile</StoryMeta>}
                          </StoryInfo>
                        </StoryHeader>
                        <StorySummary>{story.summary || "No summary"}</StorySummary>
                        <StoryFooter>
                          <VisibilityBadge>{story.visibility.toLowerCase()}</VisibilityBadge>
                          <PassageCount>{story.nodes.length} passages</PassageCount>
                        </StoryFooter>
                        <StoryActions>
                          <Button $fullWidth onClick={() => router.push(`/creator/preview/${story.slug}`)}>Preview</Button>
                          {story.reviewStatus !== "APPROVED" && (
                            <ActionButtonRow>
                              <Button $variant="outline" $size="sm" onClick={() => handleEditStory(story)}>Edit</Button>
                              <Button $variant="danger" $size="sm" onClick={() => handleDeleteStory(story.slug)} disabled={deletingSlug === story.slug}>
                                {deletingSlug === story.slug ? "Deleting…" : "Delete"}
                              </Button>
                            </ActionButtonRow>
                          )}
                          {story.reviewStatus === "PENDING" && <StatusBadge $variant="pending">📋 Pending Review</StatusBadge>}
                          {story.reviewStatus === "APPROVED" && <StatusBadge $variant="approved">✅ Approved</StatusBadge>}
                          {story.reviewStatus !== "PENDING" && story.reviewStatus !== "APPROVED" && (
                            <Button $variant="secondary" $size="sm" $fullWidth onClick={() => requestPublishExistingStory(story)} disabled={publishingSlug === story.slug}>
                              {publishingSlug === story.slug ? "Submitting…" : "Submit for Approval"}
                            </Button>
                          )}
                        </StoryActions>
                      </StoryCard>
                    )
                  })}
                </StoriesGrid>
              )}

              <CreateButtonContainer>
                <Button 
                  data-walkthrough="create-button"
                  $variant="secondary"
                  $size="lg"
                  onClick={() => { resetStoryFormToNew(); setActiveTab("new") }}
                >
                  <IconWrapper>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </IconWrapper>
                  Create New Story
                </Button>
              </CreateButtonContainer>
            </TabContent>
          )}

          {activeTab === "new" && (
            <TabContent>
              <Card>
                <CardHeader>
                  <CardTitle>Create or Update Story</CardTitle>
                  <CardDescription>Define your story structure using JSON with nodes, paths, and transitions.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Structure Guide */}
                  <InfoBoxWithMargin $color="blue">
                    <InfoBoxHeader>
                      <InfoBoxIcon $color="#60a5fa"><Info size={20} /></InfoBoxIcon>
                      <InfoBoxContentBlue>
                        <InfoBoxTitle>Story Structure Guide</InfoBoxTitle>
                        <InfoBoxListBlue>
                          <li><strong>nodes:</strong> Array of passages (key, title, type, content, media)</li>
                          <li><strong>initialResources:</strong> Starting Money, Time, Health values</li>
                          <li><strong>content.text:</strong> Array of paragraph strings</li>
                          <li><strong>content.choices:</strong> Array with id, text, leads_to, effects</li>
                          <li><strong>content.next:</strong> Target node for Continue button</li>
                          <li><strong>effects:</strong> {`{ money: ±n, health: ±n, time: -n }`}</li>
                        </InfoBoxListBlue>
                      </InfoBoxContentBlue>
                    </InfoBoxHeader>
                  </InfoBoxWithMargin>

                  {editingStoryId && (
                    <EditingBanner>
                      <EditingBannerText>
                        <EditingBannerTitle>Editing existing story</EditingBannerTitle>
                        <EditingBannerSubtitle>Reset to start a new story.</EditingBannerSubtitle>
                      </EditingBannerText>
                      <Button $variant="outline" onClick={resetStoryFormToNew}>Start fresh</Button>
                    </EditingBanner>
                  )}

                  <FormFlex onSubmit={handleCreateStory}>
                    {formError && <ErrorMessage ref={formErrorRef} tabIndex={-1}>{formError}</ErrorMessage>}

                    <FormGrid>
                      <FormGroup>
                        <Label>Story code</Label>
                        <Input value={slug} onChange={(e) => setSlug(e.target.value)} onBlur={(e) => setSlug(normalizeSlug(e.target.value))} required placeholder="my-story-code" />
                        {storyCodeConflictMessage && <ConflictText>{storyCodeConflictMessage}</ConflictText>}
                      </FormGroup>
                      <FormGroup>
                        <Label>Title</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                      </FormGroup>
                    </FormGrid>

                    <FormGroup>
                      <Label>Summary</Label>
                      <Textarea value={summary ?? ""} onChange={(e) => setSummary(e.target.value)} rows={2} />
                    </FormGroup>

                    <FormGrid>
                      <FormGroup>
                        <Label>Tags</Label>
                        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma separated" />
                      </FormGroup>
                      <FormGroup>
                        <Label>Visibility</Label>
                        <Select value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
                          <option value="PRIVATE">Private</option>
                          <option value="UNLISTED">Unlisted</option>
                          <option value="PUBLIC">Public</option>
                        </Select>
                      </FormGroup>
                    </FormGrid>

                    {/* Avatar Metadata Section */}
                    <SectionBox $color="purple">
                      <SectionHeader>
                        <SectionHeaderLeft>
                          <SectionIcon $color="#c084fc"><User size={20} /></SectionIcon>
                          <div>
                            <SectionTitlePurple>Character Profile (Avatar)</SectionTitlePurple>
                            <SectionSubtitlePurple>Protagonist with resources</SectionSubtitlePurple>
                          </div>
                        </SectionHeaderLeft>
                        <ToggleLabelPurple>
                          <Checkbox checked={includeAvatar} onChange={(e) => setIncludeAvatar(e.target.checked)} />
                          <span>Include</span>
                        </ToggleLabelPurple>
                      </SectionHeader>
                      {includeAvatar && (
                        <>
                          <AvatarSectionTitle>Identity</AvatarSectionTitle>
                          <AvatarFormGrid>
                            <FormGroup>
                              <Label>Name</Label>
                              <Input
                                value={avatarForm.name}
                                onChange={(e) => updateAvatarRootField("name", e.target.value)}
                                placeholder="Character Name"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Age</Label>
                              <Input
                                type="number"
                                value={avatarForm.age ?? ""}
                                onChange={(e) =>
                                  updateAvatarRootField(
                                    "age",
                                    e.target.value === "" ? undefined : Number(e.target.value),
                                  )
                                }
                                placeholder="25"
                              />
                            </FormGroup>
                          </AvatarFormGrid>

                          <FormGroup>
                            <Label>Background</Label>
                            <Textarea
                              value={avatarForm.background}
                              onChange={(e) => updateAvatarRootField("background", e.target.value)}
                              rows={4}
                              placeholder="Describe the character's context and stakes."
                            />
                          </FormGroup>

                          <AvatarSectionTitle>Appearance</AvatarSectionTitle>
                          <AvatarFormGrid>
                            <FormGroup>
                              <Label>Skin Tone</Label>
                              <Input
                                value={avatarForm.appearance.skinTone ?? ""}
                                onChange={(e) => updateAvatarAppearanceField("skinTone", e.target.value)}
                                placeholder="medium"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Hair Color</Label>
                              <Input
                                value={avatarForm.appearance.hairColor ?? ""}
                                onChange={(e) => updateAvatarAppearanceField("hairColor", e.target.value)}
                                placeholder="dark brown"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Hair Style</Label>
                              <Input
                                value={avatarForm.appearance.hairStyle ?? ""}
                                onChange={(e) => updateAvatarAppearanceField("hairStyle", e.target.value)}
                                placeholder="short"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Clothing</Label>
                              <Input
                                value={avatarForm.appearance.clothing ?? ""}
                                onChange={(e) => updateAvatarAppearanceField("clothing", e.target.value)}
                                placeholder="casual"
                              />
                            </FormGroup>
                          </AvatarFormGrid>

                          <FormGroup>
                            <Label>Accessories (comma separated)</Label>
                            <Input
                              value={(avatarForm.appearance.accessories ?? []).join(", ")}
                              onChange={(e) =>
                                updateAvatarAppearanceField("accessories", parseCommaSeparatedList(e.target.value))
                              }
                              placeholder="watch, backpack"
                            />
                          </FormGroup>

                          <AvatarUploadBox>
                            <AvatarUploadTitle>
                              Character Profile Image
                            </AvatarUploadTitle>
                            <AvatarUploadDescription>
                              Upload a profile image for the protagonist. Supported formats: JPG, PNG, GIF. Max size: 5MB.
                            </AvatarUploadDescription>
                            {avatarImageUploadError && (
                              <AvatarUploadError>
                                {avatarImageUploadError}
                              </AvatarUploadError>
                            )}
                            <AvatarUploadRow>
                              <HiddenInput
                                ref={avatarImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarImageUpload}
                              />
                              <PurpleOutlineButton
                                type="button"
                                $variant="outline"
                                $size="sm"
                                onClick={() => avatarImageInputRef.current?.click()}
                                disabled={avatarImageUploading}
                              >
                                {avatarImageUploading ? "Uploading…" : "Upload Profile Image"}
                              </PurpleOutlineButton>
                              {avatarImagePreview && (
                                <AvatarPreviewContainer>
                                  <AvatarPreviewImage
                                    src={avatarImagePreview}
                                    alt="Character profile"
                                  />
                                  <AvatarPreviewPath>
                                    {avatarImagePreview}
                                  </AvatarPreviewPath>
                                </AvatarPreviewContainer>
                              )}
                            </AvatarUploadRow>
                          </AvatarUploadBox>

                          <AvatarSectionTitle>Resources</AvatarSectionTitle>
                          <AvatarHintText>
                            Money, Time, and Health are controlled by Story Graph initial resources.
                          </AvatarHintText>
                          <AvatarResourceReadOnly>
                            <AvatarResourceTile>
                              <AvatarResourceLabel>Money</AvatarResourceLabel>
                              <AvatarResourceValue>
                                ${graphResourceValues.money !== "" ? graphResourceValues.money : 0}
                              </AvatarResourceValue>
                            </AvatarResourceTile>
                            <AvatarResourceTile>
                              <AvatarResourceLabel>Time</AvatarResourceLabel>
                              <AvatarResourceValue>
                                {graphResourceValues.time !== "" ? graphResourceValues.time : 0}h
                              </AvatarResourceValue>
                            </AvatarResourceTile>
                            <AvatarResourceTile>
                              <AvatarResourceLabel>Health</AvatarResourceLabel>
                              <AvatarResourceValue>
                                {graphResourceValues.health !== "" ? graphResourceValues.health : 100}%
                              </AvatarResourceValue>
                            </AvatarResourceTile>
                          </AvatarResourceReadOnly>

                          <AvatarFormGrid>
                            <FormGroup>
                              <Label>Social Support (0-100)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={avatarForm.initialResources.socialSupport ?? ""}
                                onChange={(e) => updateAvatarResourceField("socialSupport", e.target.value)}
                                placeholder="50"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Mental Health (0-100)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={avatarForm.initialResources.mentalHealth ?? ""}
                                onChange={(e) => updateAvatarResourceField("mentalHealth", e.target.value)}
                                placeholder="70"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Physical Health (0-100)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={avatarForm.initialResources.physicalHealth ?? ""}
                                onChange={(e) => updateAvatarResourceField("physicalHealth", e.target.value)}
                                placeholder="80"
                              />
                            </FormGroup>
                          </AvatarFormGrid>

                          <AvatarSectionTitle>Social Context</AvatarSectionTitle>
                          <AvatarFormGrid>
                            <FormGroup>
                              <Label>Socioeconomic Status</Label>
                              <Input
                                value={avatarForm.socialContext?.socioeconomicStatus ?? ""}
                                onChange={(e) => updateAvatarSocialContextField("socioeconomicStatus", e.target.value)}
                                placeholder="working class"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Location</Label>
                              <Input
                                value={avatarForm.socialContext?.location ?? ""}
                                onChange={(e) => updateAvatarSocialContextField("location", e.target.value)}
                                placeholder="Urban area"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Family Structure</Label>
                              <Input
                                value={avatarForm.socialContext?.familyStructure ?? ""}
                                onChange={(e) => updateAvatarSocialContextField("familyStructure", e.target.value)}
                                placeholder="Single adult"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Education Level</Label>
                              <Input
                                value={avatarForm.socialContext?.educationLevel ?? ""}
                                onChange={(e) => updateAvatarSocialContextField("educationLevel", e.target.value)}
                                placeholder="High school"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Employment Status</Label>
                              <Input
                                value={avatarForm.socialContext?.employmentStatus ?? ""}
                                onChange={(e) => updateAvatarSocialContextField("employmentStatus", e.target.value)}
                                placeholder="Part-time"
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Health Conditions (comma separated)</Label>
                              <Input
                                value={(avatarForm.socialContext?.healthConditions ?? []).join(", ")}
                                onChange={(e) =>
                                  updateAvatarSocialContextField("healthConditions", parseCommaSeparatedList(e.target.value))
                                }
                                placeholder="asthma, anxiety"
                              />
                            </FormGroup>
                          </AvatarFormGrid>

                          <CheckboxLabel>
                            <Checkbox
                              checked={avatarForm.isPlayable}
                              onChange={(e) => updateAvatarRootField("isPlayable", e.target.checked)}
                            />
                            <span>Character is playable</span>
                          </CheckboxLabel>
                        </>
                      )}
                    </SectionBox>

                    {/* Story Graph */}
                    <FormGroup>
                      <Label>Story Graph</Label>
                      <ResourcesBox>
                        <ResourcesTitle>
                          Initial Resources (Top Bar Stats)
                        </ResourcesTitle>
                        <ResourcesDescription>
                          These values live in the story graph and control the starting Money, Time, and Health.
                        </ResourcesDescription>
                        {graphResourceError && (
                          <ResourcesError>
                            {graphResourceError}
                          </ResourcesError>
                        )}
                        <FormGrid>
                          <FormGroup>
                            <Label>Money</Label>
                            <Input
                              type="number"
                              value={graphResourceValues.money}
                              onChange={(e) => updateGraphResource("money", e.target.value)}
                            />
                          </FormGroup>
                          <FormGroup>
                            <Label>Time (hours)</Label>
                            <Input
                              type="number"
                              value={graphResourceValues.time}
                              onChange={(e) => updateGraphResource("time", e.target.value)}
                            />
                          </FormGroup>
                          <FormGroup>
                            <Label>Health</Label>
                            <Input
                              type="number"
                              value={graphResourceValues.health}
                              onChange={(e) => updateGraphResource("health", e.target.value)}
                            />
                          </FormGroup>
                        </FormGrid>
                      </ResourcesBox>
                      <GraphEditorRow>
                        <Button
                          type="button"
                          $size="sm"
                          $variant="secondary"
                          onClick={() => {
                            setShowSaveHint(false)
                            setShowFlowStudio(true)
                          }}
                        >
                          Open Flow Studio
                        </Button>
                        <GraphEditorHint>Use Flow Studio to build visually, then save here.</GraphEditorHint>
                      </GraphEditorRow>
                      <MonoTextarea value={graphJson} onChange={(e) => setGraphJson(e.target.value)} rows={12} />
                    </FormGroup>

                    <SectionBox $color="emerald">
                      <SectionHeader>
                        <SectionHeaderLeft>
                          <SectionIcon $color="#34d399"><FolderOpen size={20} /></SectionIcon>
                          <div>
                            <SectionTitleEmerald>Media Library</SectionTitleEmerald>
                            <SectionSubtitleEmerald>Upload images and audio, then map them to story nodes</SectionSubtitleEmerald>
                          </div>
                        </SectionHeaderLeft>
                      </SectionHeader>

                      {mediaUploadError && (
                        <MediaLibraryError>{mediaUploadError}</MediaLibraryError>
                      )}

                      <SmallButtonRow>
                        <HiddenInput ref={imageInputRef} type="file" accept="image/*" multiple onChange={(e) => handleMediaUpload(e.target.files, "image")} />
                        <HiddenInput ref={audioInputRef} type="file" accept="audio/*" multiple onChange={(e) => handleMediaUpload(e.target.files, "audio")} />
                        
                        <EmeraldOutlineButton type="button" $variant="outline" $size="sm" onClick={() => imageInputRef.current?.click()}>
                          <IconWrapper><ImageIcon size={16} /></IconWrapper>
                          Upload Images
                        </EmeraldOutlineButton>
                        <EmeraldOutlineButton type="button" $variant="outline" $size="sm" onClick={() => audioInputRef.current?.click()}>
                          <IconWrapper><Music size={16} /></IconWrapper>
                          Upload Audio
                        </EmeraldOutlineButton>
                      </SmallButtonRow>

                      {/* Uploaded Media List */}
                      {uploadedMedia.length > 0 && (
                        <MediaListContainer>
                          <MediaListTitle>Uploaded Files ({uploadedMedia.length})</MediaListTitle>
                          <MediaGrid>
                            {uploadedMedia.map((media) => (
                              <MediaItem key={media.id}>
                                <MediaItemHeader>
                                  {media.type === "image" ? (
                                    <MediaThumbnail>
                                      <MediaThumbnailImage 
                                        src={media.serverPath || media.url} 
                                        alt="" 
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none'
                                        }}
                                      />
                                    </MediaThumbnail>
                                  ) : (
                                    <MediaThumbnail>
                                      <Music size={24} color="rgb(148, 163, 184)" />
                                    </MediaThumbnail>
                                  )}
                                  <MediaInputWrapper>
                                    <MediaInput
                                      value={media.name}
                                      onChange={(e) => handleMediaNameChange(media.id, e.target.value)}
                                      placeholder="filename.png"
                                    />
                                  </MediaInputWrapper>
                                  <CopyButton 
                                    type="button" 
                                    $variant="ghost" 
                                    $size="sm" 
                                    onClick={() => handleDuplicateMedia(media.id)} 
                                    title="Duplicate for another node"
                                  >
                                    <Copy size={16} />
                                  </CopyButton>
                                  
                                  <DeleteButton 
                                    type="button" 
                                    $variant="ghost" 
                                    $size="sm" 
                                    onClick={() => handleRemoveMedia(media.id)} 
                                  >
                                    <Trash2 size={16} />
                                  </DeleteButton>
                                </MediaItemHeader>
                                
                                <MediaRow>
                                  <MediaLabel>Map to:</MediaLabel>
                                  <MediaSelectFlex
                                    value={media.mappedToNode || ""}
                                    onChange={(e) => handleMediaNodeMapping(media.id, e.target.value)}
                                  >
                                    <option value="">Select Node</option>
                                    {media.type === "audio" && (
                                      <option value="__ALL_NODES__">All Nodes (Background Music)</option>
                                    )}
                                    {nodeKeys.map((n: NodeKeyInfo) => (
                                      <option key={n.key} value={n.key}>{n.title}</option>
                                    ))}
                                  </MediaSelectFlex>
                                </MediaRow>

                                {media.type === "image" && (
                                  <CropPreviewWrap>
                                    <CropPreviewLabel>Crop preview (how this may look in cover layouts)</CropPreviewLabel>
                                    <CropPreviewBox>
                                      <CropPreviewImage
                                        src={media.serverPath || media.url}
                                        alt=""
                                        $x={media.cropPreview?.x ?? 50}
                                        $y={media.cropPreview?.y ?? 50}
                                        $zoom={media.cropPreview?.zoom ?? 1}
                                      />
                                    </CropPreviewBox>
                                    <CropSliderGroup>
                                      <CropSliderField>
                                        Horizontal
                                        <CropSlider
                                          type="range"
                                          min={0}
                                          max={100}
                                          step={1}
                                          value={media.cropPreview?.x ?? 50}
                                          onChange={(event) =>
                                            handleMediaCropPreviewChange(media.id, "x", Number(event.target.value))
                                          }
                                        />
                                      </CropSliderField>
                                      <CropSliderField>
                                        Vertical
                                        <CropSlider
                                          type="range"
                                          min={0}
                                          max={100}
                                          step={1}
                                          value={media.cropPreview?.y ?? 50}
                                          onChange={(event) =>
                                            handleMediaCropPreviewChange(media.id, "y", Number(event.target.value))
                                          }
                                        />
                                      </CropSliderField>
                                      <CropSliderField>
                                        Zoom
                                        <CropSlider
                                          type="range"
                                          min={1}
                                          max={2}
                                          step={0.01}
                                          value={media.cropPreview?.zoom ?? 1}
                                          onChange={(event) =>
                                            handleMediaCropPreviewChange(media.id, "zoom", Number(event.target.value))
                                          }
                                        />
                                      </CropSliderField>
                                    </CropSliderGroup>
                                    <CropPreviewHint>
                                      Preview-only tool: this helps you decide how to crop your image before finalizing matching.
                                    </CropPreviewHint>
                                  </CropPreviewWrap>
                                )}

                                <MediaPath>
                                  {media.serverPath 
                                    ? (media.serverPath.includes("cloudinary.com") 
                                        ? `☁️ ${media.serverPath.slice(-50)}...` 
                                        : `Path: ${media.serverPath}`)
                                    : `Path: ${media.type === "image" ? `/scenes/${media.name}` : `/audio/${media.name}`}`
                                  }
                                </MediaPath>
                              </MediaItem>
                            ))}
                          </MediaGrid>

                          <EmeraldOutlineButtonSelfStart 
                            type="button" 
                            $variant="outline" 
                            $size="sm" 
                            onClick={applyMediaMappingsToGraph} 
                          >
                            <IconWrapper><Upload size={16} /></IconWrapper>
                            Apply Mappings to Story Graph
                          </EmeraldOutlineButtonSelfStart>

                          <MediaNote>
                            Note: Uploaded files are stored in Cloudinary. Use the generated URLs in your story graph to reference the media assets.
                          </MediaNote>
                        </MediaListContainer>
                      )}
                    </SectionBox>

                    <ButtonRowPadded>
                      <SaveHintWrapper>
                        {showSaveHint && (
                          <SaveHint role="status">
                            <SaveHintTitle>Almost there</SaveHintTitle>
                            <div>If everything is finalized, save the story.</div>
                            <SaveHintDismiss>
                              <SaveHintButton
                                type="button"
                                onClick={() => setShowSaveHint(false)}
                              >
                                Got it
                              </SaveHintButton>
                            </SaveHintDismiss>
                          </SaveHint>
                        )}
                        <Button
                          ref={saveButtonRef}
                          type="submit"
                          disabled={creating || hasStoryCodeConflict}
                          onClick={() => setShowSaveHint(false)}
                        >
                          {creating ? "Saving…" : "Save Story"}
                        </Button>
                      </SaveHintWrapper>
                      <Button type="button" $variant="secondary" disabled={publishing || hasStoryCodeConflict} onClick={requestPublishNewStory}>
                        {publishing ? "Submitting…" : "Publish for Approval"}
                      </Button>
                    </ButtonRowPadded>

                    {publishError && <ErrorMessage ref={publishErrorRef} tabIndex={-1}>{publishError}</ErrorMessage>}
                    {publishSuccess && <SuccessMessage>{publishSuccess}</SuccessMessage>}
                  </FormFlex>
                </CardContent>
              </Card>
            </TabContent>
          )}

          {activeTab === "import" && (
            <TabContent>
              <Card>
                <CardHeader>
                  <CardTitle>Import from Twine</CardTitle>
                  <CardDescription>Upload a Twine .zip, .json, or .html export to convert into a Loop story.</CardDescription>
                </CardHeader>
                <CardContentFlex>
                  <ImportGrid>
                    <ImportColumn>
                      <InfoBoxPadded $color="blue">
                        <ImportInfoHeader>
                          <Info size={20} color="rgb(147, 197, 253)" />
                          <ImportInfoTitle>How Twine Import Works</ImportInfoTitle>
                        </ImportInfoHeader>
                        <ImportInfoContent>
                          <ImportInfoParagraph>Export your Twine story using the <strong>Twison</strong> story format, which outputs a JSON file that Loop can parse.</ImportInfoParagraph>
                          <ImportMappingList>
                            <ImportMappingRow>
                              <ImportMappingSource>passage.name</ImportMappingSource>
                              <ImportMappingArrow>→</ImportMappingArrow>
                              <ImportMappingTarget>node.key</ImportMappingTarget>
                            </ImportMappingRow>
                            <ImportMappingRow>
                              <ImportMappingSource>passage.text</ImportMappingSource>
                              <ImportMappingArrow>→</ImportMappingArrow>
                              <ImportMappingTarget>content.text[]</ImportMappingTarget>
                            </ImportMappingRow>
                            <ImportMappingRow>
                              <ImportMappingSource>[[Choice→target]]</ImportMappingSource>
                              <ImportMappingArrow>→</ImportMappingArrow>
                              <ImportMappingTarget>content.choices[]</ImportMappingTarget>
                            </ImportMappingRow>
                            <ImportMappingRow>
                              <ImportMappingSource>[image:path.png]</ImportMappingSource>
                              <ImportMappingArrow>→</ImportMappingArrow>
                              <ImportMappingTarget>media.image</ImportMappingTarget>
                            </ImportMappingRow>
                            <ImportMappingRow>
                              <ImportMappingSource>[effect:money:-50]</ImportMappingSource>
                              <ImportMappingArrow>→</ImportMappingArrow>
                              <ImportMappingTarget>choice.effects</ImportMappingTarget>
                            </ImportMappingRow>
                          </ImportMappingList>
                        </ImportInfoContent>
                      </InfoBoxPadded>

                      {/* Twison JSON Format Example */}
                      <TwisonFormatBox>
                        <ImportInfoHeader>
                          <FileJson size={20} color="rgb(216, 180, 254)" />
                          <ImportInfoTitle>Twison Export Format</ImportInfoTitle>
                        </ImportInfoHeader>
                        <InfoBoxCompact $color="amber">
                          <AmberNoteText>
                            <strong>Note:</strong> This is the format Twine exports. Upload the file below and Loop converts it automatically. Note that if you paste directly into the &quot;Create/Update&quot; tab, it will not accept this format and instead use Loop&apos;s native format.
                          </AmberNoteText>
                        </InfoBoxCompact>
                        <CodeBlock>{twineJsonExample}</CodeBlock>
                        <LinkRow>
                          <ExternalLink href="https://github.com/lazerwalker/twison" target="_blank" rel="noreferrer" $color="purple">
                            Get Twison Format
                          </ExternalLink>
                          <ExternalLink href="https://twinery.org/" target="_blank" rel="noreferrer" $color="slate">
                            Twine Editor
                          </ExternalLink>
                        </LinkRow>
                      </TwisonFormatBox>
                    </ImportColumn>

                    <ImportColumn>
                      {/* CLI Upload */}
                      <InfoBoxPadded $color="emerald">
                        <ImportInfoHeader>
                          <UploadCloud size={20} color="rgb(110, 231, 183)" />
                          <ImportInfoTitle>CLI Upload</ImportInfoTitle>
                        </ImportInfoHeader>
                        <CLIDescription>
                          Skip manual uploads and run the Loop CLI helper against your Twison export:
                        </CLIDescription>
                        <SmallCodeBlock>
{`npx tsx twine/upload-to-loop.ts ./story.json \\
  --cookie "loop.session=VALUE" \\
  --avatar ./avatar.json`}
                        </SmallCodeBlock>
                      </InfoBoxPadded>

                      {/* Inline Checklist */}
                      <InfoBoxPadded $color="purple">
                        <ImportInfoHeader>
                          <ClipboardCheck size={20} color="rgb(216, 180, 254)" />
                          <ImportInfoTitle>Import Checklist</ImportInfoTitle>
                        </ImportInfoHeader>
                        <ChecklistContainer>
                          {twineChecklistSections.map((section, sectionIndex) => (
                            <ChecklistSection key={section.title}>
                              <ChecklistSectionTitle>{section.title}</ChecklistSectionTitle>
                              <ChecklistItems>
                                {section.items.map((item, itemIndex) => (
                                  <ChecklistItem key={item}>
                                    <ChecklistCheckbox
                                      checked={twineChecklistState[sectionIndex][itemIndex]}
                                      onChange={(e) => handleTwineChecklistToggle(sectionIndex, itemIndex, e.target.checked)}
                                    />
                                    <ChecklistItemText>{item}</ChecklistItemText>
                                  </ChecklistItem>
                                ))}
                              </ChecklistItems>
                            </ChecklistSection>
                          ))}
                        </ChecklistContainer>
                        <ClearChecklistButton type="button" $variant="ghost" $size="sm" onClick={resetTwineChecklist}>
                          Clear checklist
                        </ClearChecklistButton>
                      </InfoBoxPadded>
                    </ImportColumn>
                  </ImportGrid>

                  <FormFlex onSubmit={handleImportSubmit}>
                    {importError && <ErrorMessage ref={importErrorRef} tabIndex={-1}>{importError}</ErrorMessage>}
                    {importSuccess && <SuccessMessage>{importSuccess}</SuccessMessage>}

                    <FormGroup>
                      <Label>Twine export file</Label>
                      <Input type="file" required accept=".zip,.json,.html" onChange={(e) => {
                        const selected = e.target.files?.[0] ?? null
                        setImportFile(selected)
                        if (selected && !importSlug) {
                          setImportSlug(normalizeSlug(selected.name.replace(/\.(zip|json|html)$/i, "")))
                        }
                      }} />
                    </FormGroup>

                    <FormGrid>
                      <FormGroup>
                        <Label>Story code</Label>
                        <Input value={importSlug} onChange={(e) => setImportSlug(normalizeSlug(e.target.value))} placeholder="my-story-code" />
                      </FormGroup>
                      <FormGroup>
                        <Label>Visibility</Label>
                        <Select value={importVisibility} onChange={(e) => setImportVisibility(e.target.value as typeof importVisibility)}>
                          <option value="PRIVATE">Private</option>
                          <option value="UNLISTED">Unlisted</option>
                          <option value="PUBLIC">Public</option>
                        </Select>
                      </FormGroup>
                    </FormGrid>

                    <FormGrid>
                      <FormGroup>
                        <Label>Title override</Label>
                        <Input value={importTitle} onChange={(e) => setImportTitle(e.target.value)} />
                      </FormGroup>
                      <FormGroup>
                        <Label>Tags</Label>
                        <Input value={importTags} onChange={(e) => setImportTags(e.target.value)} placeholder="equity, empathy" />
                      </FormGroup>
                    </FormGrid>

                    <FormGroup>
                      <Label>Summary override</Label>
                      <Textarea value={importSummary} onChange={(e) => setImportSummary(e.target.value)} rows={2} />
                    </FormGroup>

                    {/* Avatar for Import */}
                    <SectionBox $color="purple">
                      <SectionHeader>
                        <SectionHeaderLeft>
                          <SectionIcon $color="#c084fc"><User size={20} /></SectionIcon>
                          <div>
                            <SectionTitlePurple>Character Profile</SectionTitlePurple>
                            <SectionSubtitlePurple>Add protagonist metadata</SectionSubtitlePurple>
                          </div>
                        </SectionHeaderLeft>
                        <ToggleLabelPurple>
                          <Checkbox checked={importIncludeAvatar} onChange={(e) => setImportIncludeAvatar(e.target.checked)} />
                          <span>Include</span>
                        </ToggleLabelPurple>
                      </SectionHeader>
                      {importIncludeAvatar && (
                        <>
                          <MonoTextarea value={importAvatarJson} onChange={(e) => setImportAvatarJson(e.target.value)} rows={10} />
                          <AvatarUploadBox>
                            <AvatarUploadTitle>
                              Character Profile Image
                            </AvatarUploadTitle>
                            <AvatarUploadDescription>
                              Upload a profile image for the protagonist (stored in Cloudinary). This is separate from the Media Library.
                            </AvatarUploadDescription>
                            {importAvatarImageUploadError && (
                              <AvatarUploadError>
                                {importAvatarImageUploadError}
                              </AvatarUploadError>
                            )}
                            <AvatarUploadRow>
                              <HiddenInput
                                ref={importAvatarImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImportAvatarImageUpload}
                              />
                              <PurpleOutlineButton
                                type="button"
                                $variant="outline"
                                $size="sm"
                                onClick={() => importAvatarImageInputRef.current?.click()}
                                disabled={importAvatarImageUploading}
                              >
                                {importAvatarImageUploading ? "Uploading…" : "Upload Profile Image"}
                              </PurpleOutlineButton>
                              {importAvatarImagePreview && (
                                <AvatarPreviewContainer>
                                  <AvatarPreviewImage
                                    src={importAvatarImagePreview}
                                    alt="Character profile"
                                  />
                                  <AvatarPreviewPath>
                                    {importAvatarImagePreview}
                                  </AvatarPreviewPath>
                                </AvatarPreviewContainer>
                              )}
                            </AvatarUploadRow>
                          </AvatarUploadBox>
                        </>
                      )}
                    </SectionBox>

                    <ButtonRow>
                      <Button type="submit" disabled={importing || !importFile}>
                        {importing ? "Importing…" : "Import Story"}
                      </Button>
                      <Button type="button" $variant="ghost" onClick={() => {
                        setImportFile(null)
                        setImportSlug("")
                        setImportTitle("")
                        setImportSummary("")
                        setImportTags("")
                        setImportAvatarJson(avatarTemplateJson)
                        setImportAvatarImageUploadError(null)
                        setImportError(null)
                      }}>
                        Reset
                      </Button>
                    </ButtonRow>
                  </FormFlex>
                </CardContentFlex>
              </Card>
            </TabContent>
          )}
        </TabsContainer>

        {/* Ownership Dialog */}
        {ownershipModalOpen && (
          <DialogOverlay onClick={() => { setOwnershipModalOpen(false); resetOwnershipModal() }}>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogTitle>Transfer & credit acknowledgement</DialogTitle>
              <DialogDescription>Approved stories move into Loop&apos;s shared catalogue with permanent credit.</DialogDescription>
              <DialogBody>
                <CheckboxLabel>
                  <DialogCheckbox checked={ownershipAck.transfer} onChange={(e) => setOwnershipAck((prev) => ({ ...prev, transfer: e.target.checked }))} />
                  <span>I understand Loop becomes the hosting owner while keeping my credit visible.</span>
                </CheckboxLabel>
                <CheckboxLabel>
                  <DialogCheckbox checked={ownershipAck.contact} onChange={(e) => setOwnershipAck((prev) => ({ ...prev, contact: e.target.checked }))} />
                  <span>I know removal after approval requires a Contact Us request.</span>
                </CheckboxLabel>
              </DialogBody>
              <DialogFooter>
                <Button $variant="outline" onClick={() => { setOwnershipModalOpen(false); resetOwnershipModal() }}>Cancel</Button>
                <Button $variant="secondary" disabled={!ownershipAck.transfer || !ownershipAck.contact || ownershipConfirmLoading} onClick={handleOwnershipConfirm}>
                  {ownershipConfirmLoading ? "Submitting…" : "I agree & submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        )}

        {/* Delete Confirmation Dialog */}
        {confirmDialog.slug && (
          <DialogOverlay onClick={() => setConfirmDialog({ slug: null, action: null })}>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
              <DialogFooter>
                <Button $variant="outline" onClick={() => setConfirmDialog({ slug: null, action: null })}>Cancel</Button>
                <Button $variant="danger" onClick={confirmDeleteStory}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </DialogOverlay>
        )}

        <WelcomeModal isOpen={showWelcome} onStart={handleStartWalkthrough} onSkip={handleSkipWalkthrough} />
        <CreatorWalkthrough
          isOpen={showWalkthrough}
          onComplete={handleCompleteWalkthrough}
          onTabChange={setActiveTab}
          hasExampleStory={hasExampleStory}
        />
      </MainContent>
    </PageContainer>
  )
}

export default function CreatorDashboard() {
  return (
    <Suspense fallback={
      <LoadingContainer>
        <LoadingDot />
      </LoadingContainer>
    }>
      <CreatorDashboardContent />
    </Suspense>
  )
}
