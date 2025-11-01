-- Create new enums
CREATE TYPE "CreatorProfileStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "StoryOwnershipStatus" AS ENUM ('CREATOR_DRAFT', 'PENDING_TRANSFER', 'PLATFORM_OWNED', 'RETURNED');

-- Extend UserProfile with richer public fields
ALTER TABLE "UserProfile"
  ADD COLUMN "pronouns" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "publicEmail" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "twitterHandle" TEXT,
  ADD COLUMN "instagramHandle" TEXT,
  ADD COLUMN "tiktokHandle" TEXT,
  ADD COLUMN "expertiseTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "customLinks" JSONB;

-- Create CreatorProfile table
CREATE TABLE "CreatorProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "penName" TEXT,
  "headline" TEXT,
  "expertiseTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "focusAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tagline" TEXT,
  "biography" TEXT,
  "websiteUrl" TEXT,
  "portfolioUrl" TEXT,
  "contactEmail" TEXT,
  "socialLinks" JSONB,
  "payoutDetails" JSONB,
  "guidelinesAcceptedAt" TIMESTAMP(3),
  "termsAcceptedAt" TIMESTAMP(3),
  "consentAcceptedAt" TIMESTAMP(3),
  "consentStatement" TEXT,
  "status" "CreatorProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "completedAt" TIMESTAMP(3),
  "lastReviewedAt" TIMESTAMP(3),
  "lastReviewerId" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

ALTER TABLE "CreatorProfile"
  ADD CONSTRAINT "CreatorProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorProfile"
  ADD CONSTRAINT "CreatorProfile_lastReviewerId_fkey"
  FOREIGN KEY ("lastReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend TwineStory with ownership & approval tracking
ALTER TABLE "TwineStory"
  ADD COLUMN "originalCreatorId" TEXT,
  ADD COLUMN "originalCreatorProfileId" TEXT,
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "ownershipStatus" "StoryOwnershipStatus" NOT NULL DEFAULT 'CREATOR_DRAFT',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "transferConsentAt" TIMESTAMP(3),
  ADD COLUMN "transferConsentIp" TEXT,
  ADD COLUMN "transferConsentUserAgent" TEXT,
  ADD COLUMN "approvalToken" TEXT,
  ADD COLUMN "approvalTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "reviewComment" TEXT,
  ADD COLUMN "creditText" TEXT;

ALTER TABLE "TwineStory"
  ADD CONSTRAINT "TwineStory_originalCreatorId_fkey"
  FOREIGN KEY ("originalCreatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TwineStory"
  ADD CONSTRAINT "TwineStory_originalCreatorProfileId_fkey"
  FOREIGN KEY ("originalCreatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TwineStory"
  ADD CONSTRAINT "TwineStory_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend StoryVersion to capture ownership state & consent snapshot
ALTER TABLE "StoryVersion"
  ADD COLUMN "ownershipStatus" "StoryOwnershipStatus" NOT NULL DEFAULT 'CREATOR_DRAFT',
  ADD COLUMN "consentSnapshot" JSONB;

-- Story audit trail
CREATE TABLE "StoryAuditLog" (
  "id" TEXT PRIMARY KEY,
  "storyId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "StoryAuditLog_storyId_idx" ON "StoryAuditLog"("storyId");
CREATE INDEX "StoryAuditLog_actorId_idx" ON "StoryAuditLog"("actorId");

ALTER TABLE "StoryAuditLog"
  ADD CONSTRAINT "StoryAuditLog_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "TwineStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryAuditLog"
  ADD CONSTRAINT "StoryAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
