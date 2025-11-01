-- CreateTable
CREATE TABLE "AvatarProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "background" TEXT,
    "appearance" JSONB,
    "initialResources" JSONB NOT NULL,
    "socialContext" JSONB,
    "isPlayable" BOOLEAN NOT NULL DEFAULT false,
    "storyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Set primary key
ALTER TABLE "AvatarProfile"
  ADD CONSTRAINT "AvatarProfile_pkey" PRIMARY KEY ("id");

-- Add foreign key
ALTER TABLE "AvatarProfile"
  ADD CONSTRAINT "AvatarProfile_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "TwineStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
