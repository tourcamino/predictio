-- Protocol registry: sport columns on curated_events (required for persist-all upserts)
ALTER TABLE "curated_events" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'football';
ALTER TABLE "curated_events" ADD COLUMN IF NOT EXISTS "sportSlug" TEXT NOT NULL DEFAULT 'football';
