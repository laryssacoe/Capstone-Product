/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `TwineStory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TwineStory_title_key" ON "TwineStory"("title");
