-- CreateEnum
CREATE TYPE "StoryNodeType" AS ENUM ('NARRATIVE', 'DECISION', 'RESOLUTION');

-- CreateTable StoryNode
CREATE TABLE "StoryNode" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "synopsis" TEXT,
    "type" "StoryNodeType" NOT NULL DEFAULT 'NARRATIVE',
    "content" JSONB,
    "media" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoryNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable StoryPath
CREATE TABLE "StoryPath" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoryPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable StoryTransition
CREATE TABLE "StoryTransition" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "toNodeId" TEXT,
    "ordering" INTEGER,
    "condition" JSONB,
    "effect" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoryTransition_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "StoryNode_storyId_key_key" ON "StoryNode"("storyId", "key");
CREATE UNIQUE INDEX "StoryPath_storyId_key_key" ON "StoryPath"("storyId", "key");
CREATE UNIQUE INDEX "StoryTransition_storyId_fromNodeId_pathId_toNodeId_key" ON "StoryTransition"("storyId", "fromNodeId", "pathId", "toNodeId");

-- Foreign keys
ALTER TABLE "StoryNode"
  ADD CONSTRAINT "StoryNode_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "TwineStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryPath"
  ADD CONSTRAINT "StoryPath_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "TwineStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryTransition"
  ADD CONSTRAINT "StoryTransition_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "TwineStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "StoryTransition_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "StoryNode"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "StoryTransition_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "StoryNode"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StoryTransition_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "StoryPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
