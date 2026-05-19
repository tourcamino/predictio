/**
 * PR23B — Canonical continuous football inventory buckets (frontend mirror).
 */
import {
  europeanLeagueImportance,
  isMajorTournamentLeague,
} from "~/lib/markets/marketPriorityEngine";

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
    counts[classifyInventoryBucket(item, nowMs)] += 1;
    if (isMajorEvent(item)) counts.MAJOR_EVENTS += 1;
  }
  return counts;
}

export { europeanLeagueImportance };
