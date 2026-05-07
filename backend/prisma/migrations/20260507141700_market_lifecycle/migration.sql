-- Add market lifecycle fields to curated_events
-- - lockedAt = startsAt - 5 minutes
-- - status: OPEN → LOCKED → RESOLVED

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketStatus') THEN
    CREATE TYPE "MarketStatus" AS ENUM ('OPEN', 'LOCKED', 'RESOLVED');
  END IF;
END$$;

ALTER TABLE "curated_events"
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "status" "MarketStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "result" TEXT;

UPDATE "curated_events"
SET "lockedAt" = "startsAt" - INTERVAL '5 minutes'
WHERE "lockedAt" IS NULL;

ALTER TABLE "curated_events"
  ALTER COLUMN "lockedAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "curated_events_status_idx" ON "curated_events" ("status");

