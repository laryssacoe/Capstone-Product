-- CreateEnum
CREATE TYPE "StoryInteractionKind" AS ENUM ('VIEW', 'SELECT', 'START');

-- AlterTable
ALTER TABLE "AvatarProfile" ADD COLUMN     "experienceClicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "experienceStarts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StoryInteraction" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "storyId" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "kind" "StoryInteractionKind" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryInteraction_avatarId_kind_createdAt_idx" ON "StoryInteraction"("avatarId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "StoryInteraction_sessionId_idx" ON "StoryInteraction"("sessionId");

-- CreateIndex
CREATE INDEX "StoryInteraction_userId_idx" ON "StoryInteraction"("userId");

-- AddForeignKey
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "AvatarProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "TwineStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
