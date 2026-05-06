-- CreateTable
CREATE TABLE "curated_events" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leagueName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeImage" TEXT,
    "awayImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedBy" TEXT NOT NULL,

    CONSTRAINT "curated_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curated_events_gameId_key" ON "curated_events"("gameId");

-- CreateIndex
CREATE INDEX "curated_events_isActive_idx" ON "curated_events"("isActive");

-- CreateIndex
CREATE INDEX "curated_events_startsAt_idx" ON "curated_events"("startsAt");
