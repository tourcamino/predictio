/**
 * PR23B — Canonical continuous football inventory buckets.
 */
import { europeanLeagueImportance, isMajorTournamentLeague } from "./marketPriorityEngine";

export type InventoryBucketId =
  | "LIVE_NOW"
  | "STARTING_SOON"
  | "NEXT_24H"
  | "NEXT_72H"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "MAJOR_EVENTS";

export type InventoryBucketInput = {
  kickoffMs: number;
  leagueName?: string;
  isLive?: boolean;
  status?: string;
};

export type InventoryBucketCounts = Record<InventoryBucketId, number>;

const BUCKET_IDS: InventoryBucketId[] = [
  "LIVE_NOW",
  "STARTING_SOON",
  "NEXT_24H",
  "NEXT_72H",
  "THIS_WEEK",
  "THIS_MONTH",
  "MAJOR_EVENTS",
];

export function emptyBucketCounts(): InventoryBucketCounts {
  return Object.fromEntries(BUCKET_IDS.map((id) => [id, 0])) as InventoryBucketCounts;
}

/** Primary temporal bucket (exclusive). */
export function classifyInventoryBucket(
  input: InventoryBucketInput,
  nowMs = Date.now(),
): InventoryBucketId {
  const st = String(input.status ?? "").toUpperCase();
  const isLive =
    input.isLive === true || st === "LIVE" || st === "live" || st === "LOCKED";

  if (isLive) return "LIVE_NOW";

  const hours = (input.kickoffMs - nowMs) / 3_600_000;

  if (hours < 0 && hours >= -3) return "LIVE_NOW";
  if (hours >= 0 && hours <= 3) return "STARTING_SOON";
  if (hours <= 24) return "NEXT_24H";
  if (hours <= 72) return "NEXT_72H";
  if (hours <= 168) return "THIS_WEEK";
  return "THIS_MONTH";
}

export function isMajorEvent(input: Pick<InventoryBucketInput, "leagueName">): boolean {
  return isMajorTournamentLeague(input.leagueName);
}

export function computeInventoryBucketCounts(
  items: InventoryBucketInput[],
  nowMs = Date.now(),
): InventoryBucketCounts {
  const counts = emptyBucketCounts();
  for (const item of items) {
    const bucket = classifyInventoryBucket(item, nowMs);
    counts[bucket] += 1;
    if (isMajorEvent(item)) counts.MAJOR_EVENTS += 1;
  }
  return counts;
}

export function logInventoryBucketCounts(
  counts: InventoryBucketCounts,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      tag: "INVENTORY_BUCKET_COUNTS",
      LIVE_NOW_COUNT: counts.LIVE_NOW,
      STARTING_SOON_COUNT: counts.STARTING_SOON,
      NEXT24_COUNT: counts.NEXT_24H,
      NEXT72_COUNT: counts.NEXT_72H,
      THIS_WEEK_COUNT: counts.THIS_WEEK,
      THIS_MONTH_COUNT: counts.THIS_MONTH,
      MAJOR_COUNT: counts.MAJOR_EVENTS,
      ...extra,
    }),
  );
}

export function bucketFromKickoffSec(
  kickoffSec: number,
  leagueName: string,
  status: string,
  nowSec: number,
): InventoryBucketId {
  return classifyInventoryBucket(
    {
      kickoffMs: kickoffSec * 1000,
      leagueName,
      status,
      isLive: status === "LIVE",
    },
    nowSec * 1000,
  );
}

export function footballOnlyFilter<T extends { sport?: string; sportSlug?: string }>(
  items: T[],
): T[] {
  return items.filter((m) => {
    const s = (m.sportSlug ?? m.sport ?? "").toLowerCase();
    return s === "football" || s === "soccer";
  });
}

export { europeanLeagueImportance };
