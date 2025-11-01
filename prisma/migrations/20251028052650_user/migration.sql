-- DropIndex
DROP INDEX "public"."StoryAuditLog_actorId_idx";

-- DropIndex
DROP INDEX "public"."StoryAuditLog_storyId_idx";

-- AlterTable
ALTER TABLE "CreatorProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;
