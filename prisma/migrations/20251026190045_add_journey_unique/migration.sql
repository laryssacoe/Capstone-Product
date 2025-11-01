-- Add unique constraint for user progress per scenario
ALTER TABLE "JourneyProgress"
ADD CONSTRAINT "JourneyProgress_userId_scenarioId_key" UNIQUE ("userId", "scenarioId");
