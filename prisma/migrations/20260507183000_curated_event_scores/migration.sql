-- AlterTable
ALTER TABLE "curated_events" ADD COLUMN "importanceScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "curated_events" ADD COLUMN "autoPublish" BOOLEAN NOT NULL DEFAULT false;
