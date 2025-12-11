-- CreateTable
CREATE TABLE "StorySave" (
    "id" TEXT NOT NULL,
    "storySlug" TEXT NOT NULL,
    "storyVersion" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "saveName" TEXT,
    "isAutoSave" BOOLEAN NOT NULL DEFAULT false,
    "currentPassageId" TEXT NOT NULL,
    "resources" JSONB,
    "hiddenState" JSONB,
    "visitedPassages" JSONB,
    "choicesMade" JSONB,
    "pathTaken" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "endingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorySave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryCompletion" (
    "id" TEXT NOT NULL,
    "storySlug" TEXT NOT NULL,
    "storyVersion" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "endingId" TEXT NOT NULL,
    "endingType" TEXT,
    "finalResources" JSONB,
    "finalHiddenState" JSONB,
    "totalChoices" INTEGER NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "pathTaken" JSONB,
    "choicesMade" JSONB,
    "reflectionResponses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAnalytics" (
    "storySlug" TEXT NOT NULL,
    "totalStarts" INTEGER NOT NULL DEFAULT 0,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "endingCounts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryAnalytics_pkey" PRIMARY KEY ("storySlug")
);

-- CreateIndex
CREATE INDEX "StorySave_storySlug_idx" ON "StorySave"("storySlug");

-- CreateIndex
CREATE INDEX "StorySave_sessionId_idx" ON "StorySave"("sessionId");

-- CreateIndex
CREATE INDEX "StorySave_userId_idx" ON "StorySave"("userId");

-- CreateIndex
CREATE INDEX "StoryCompletion_storySlug_idx" ON "StoryCompletion"("storySlug");

-- CreateIndex
CREATE INDEX "StoryCompletion_sessionId_idx" ON "StoryCompletion"("sessionId");

-- CreateIndex
CREATE INDEX "StoryCompletion_userId_idx" ON "StoryCompletion"("userId");

-- AddForeignKey
ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCompletion" ADD CONSTRAINT "StoryCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCompletion" ADD CONSTRAINT "StoryCompletion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
