/**
 * Forensic tracing for `curated_events` lifecycle (upsert / disable / jobs).
 * Enable: PREDICTIO_CURATED_LIFECYCLE_FORENSIC=true
 *   or PREDICTIO_RAW_FEED_MODE=true
 *   or PREDICTIO_HOME_PIPELINE_FORENSIC=true
 */
import type { MarketStatus, PrismaClient } from "@prisma/client";

export type CuratedUpsertAction =
  | "created"
  | "updated"
  | "reactivated"
  | "skipped"
  | "disabled"
  | "deleted";

export type CuratedEventSnapshot = {
  externalId: string;
  title: string;
  beforeStatus: MarketStatus | null;
  afterStatus: MarketStatus | null;
  beforeIsActive: boolean | null;
  afterIsActive: boolean | null;
};

export function isCuratedLifecycleForensicEnabled(): boolean {
  const keys = [
    "PREDICTIO_CURATED_LIFECYCLE_FORENSIC",
    "PREDICTIO_RAW_FEED_MODE",
    "PREDICTIO_HOME_PIPELINE_FORENSIC",
  ];
  for (const k of keys) {
    const v = String(process.env[k] ?? "")
      .trim()
      .toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
  }
  return false;
}

export async function readCuratedSnapshot(
  prisma: PrismaClient,
  gameId: string,
): Promise<{ status: MarketStatus; isActive: boolean; title: string } | null> {
  const row = await prisma.curatedEvent.findUnique({
    where: { gameId },
    select: { status: true, isActive: true, title: true },
  });
  return row;
}

export function logUpsertEvent(payload: {
  externalId: string;
  title: string;
  beforeStatus: MarketStatus | null;
  afterStatus: MarketStatus;
  beforeIsActive: boolean | null;
  afterIsActive: boolean;
  action: CuratedUpsertAction;
  source: string;
  extra?: Record<string, unknown>;
}): void {
  if (!isCuratedLifecycleForensicEnabled()) return;
  console.log(
    JSON.stringify({
      tag: "UPSERT_EVENT",
      externalId: payload.externalId,
      title: payload.title,
      beforeStatus: payload.beforeStatus,
      afterStatus: payload.afterStatus,
      beforeIsActive: payload.beforeIsActive,
      afterIsActive: payload.afterIsActive,
      action: payload.action,
      source: payload.source,
      ...payload.extra,
    }),
  );
}

export function logDisabledEvent(payload: {
  externalId: string;
  title: string;
  reason: string;
  beforeStatus?: MarketStatus | null;
  beforeIsActive?: boolean | null;
  source: string;
}): void {
  if (!isCuratedLifecycleForensicEnabled()) return;
  console.log(
    JSON.stringify({
      tag: "DISABLED_EVENT",
      externalId: payload.externalId,
      title: payload.title,
      rejectionReason: payload.reason,
      reason: payload.reason,
      beforeStatus: payload.beforeStatus ?? null,
      beforeIsActive: payload.beforeIsActive ?? null,
      source: payload.source,
    }),
  );
}

export type CuratedJobMetrics = {
  eventsRead?: number;
  eventsWritten?: number;
  eventsDisabled?: number;
  eventsDeleted?: number;
  eventsLocked?: number;
  eventsResolved?: number;
  openActiveAfter?: number;
  extra?: Record<string, unknown>;
};

export async function runCuratedLifecycleJob<T>(
  jobName: string,
  fn: () => Promise<T & CuratedJobMetrics>,
): Promise<T & CuratedJobMetrics> {
  if (!isCuratedLifecycleForensicEnabled()) {
    return fn();
  }

  const startTime = new Date().toISOString();
  const t0 = Date.now();
  try {
    const result = await fn();
    console.log(
      JSON.stringify({
        tag: "CURATED_LIFECYCLE_JOB",
        JOB_NAME: jobName,
        START_TIME: startTime,
        END_TIME: new Date().toISOString(),
        DURATION_MS: Date.now() - t0,
        EVENTS_READ: result.eventsRead ?? null,
        EVENTS_WRITTEN: result.eventsWritten ?? null,
        EVENTS_DISABLED: result.eventsDisabled ?? null,
        EVENTS_DELETED: result.eventsDeleted ?? null,
        EVENTS_LOCKED: result.eventsLocked ?? null,
        EVENTS_RESOLVED: result.eventsResolved ?? null,
        OPEN_ACTIVE_AFTER: result.openActiveAfter ?? null,
        ...result.extra,
      }),
    );
    return result;
  } catch (err) {
    console.log(
      JSON.stringify({
        tag: "CURATED_LIFECYCLE_JOB",
        JOB_NAME: jobName,
        START_TIME: startTime,
        END_TIME: new Date().toISOString(),
        DURATION_MS: Date.now() - t0,
        ERROR: err instanceof Error ? err.message : String(err),
      }),
    );
    throw err;
  }
}

/** Log rows affected by updateMany before bulk disable. */
export async function logBulkDisableForensic(
  prisma: PrismaClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any,
  reason: string,
  source: string,
): Promise<void> {
  if (!isCuratedLifecycleForensicEnabled()) return;

  const victims = await prisma.curatedEvent.findMany({
    where,
    select: { gameId: true, title: true, status: true, isActive: true },
    take: 500,
  });

  for (const row of victims) {
    logDisabledEvent({
      externalId: row.gameId,
      title: row.title,
      reason,
      beforeStatus: row.status,
      beforeIsActive: row.isActive,
      source,
    });
  }

  if (victims.length >= 500) {
    console.log(
      JSON.stringify({
        tag: "DISABLED_EVENT_TRUNCATED",
        source,
        reason,
        logged: 500,
      }),
    );
  }
}

export function inferUpsertAction(
  before: { status: MarketStatus; isActive: boolean } | null,
  afterStatus: MarketStatus,
  afterIsActive: boolean,
): CuratedUpsertAction {
  if (!before) return "created";
  if (before.status !== "OPEN" && afterStatus === "OPEN" && afterIsActive) {
    return "reactivated";
  }
  if (!before.isActive && afterIsActive) return "reactivated";
  return "updated";
}

export const CURATED_LIFECYCLE_WRITERS = [
  {
    id: "boot_autoSeedEventsOnBoot",
    file: "backend/src/index.ts",
    prisma: "curatedEvent.upsert",
    when: "Server boot; curated mode; active OPEN count < 9",
    cap: "BOOT_SEED_MAX=9 from pipeline games.slice(0,9)",
  },
  {
    id: "boot_rawFeedSync",
    file: "backend/src/index.ts",
    prisma: "syncRawFeedGamesToPrisma",
    when: "Server boot; PREDICTIO_RAW_FEED_MODE=true",
    cap: "PREDICTIO_RAW_FEED_DB_CAP (default 800)",
  },
  {
    id: "get_api_markets_raw_sync",
    file: "backend/src/routes/adminCuration.ts",
    prisma: "syncRawFeedGamesToPrisma",
    when: "GET /api/markets raw mode; throttled 90s",
    cap: "rawFeedDbSyncCap",
  },
  {
    id: "admin_events_select",
    file: "backend/src/routes/adminCuration.ts",
    prisma: "curatedEvent.upsert | updateMany isActive:false",
    when: "POST /api/admin/events/select",
    cap: "MAX_ACTIVE=9",
  },
  {
    id: "market_status_updater_refill",
    file: "backend/src/jobs/marketStatusUpdater.ts",
    prisma: "curatedEvent.upsert",
    when: "setInterval 60s; OPEN active < 9; NOT raw feed mode",
    cap: "MAX_ACTIVE_CURATED=9",
  },
  {
    id: "market_status_updater_lock",
    file: "backend/src/jobs/marketStatusUpdater.ts",
    prisma: "updateMany status LOCKED isActive false",
    when: "lockedAt <= now",
  },
  {
    id: "market_status_updater_resolve",
    file: "backend/src/jobs/marketStatusUpdater.ts",
    prisma: "curatedEvent.update RESOLVED",
    when: "Azuro game Finished/Resolved",
  },
  {
    id: "raw_feed_db_sync",
    file: "backend/src/services/rawFeedDbSync.ts",
    prisma: "upsert + deactivate notIn snapshot",
    when: "RAW_FEED_MODE sync",
  },
  {
    id: "publish_events_script",
    file: "backend/src/scripts/publishEvents.ts",
    prisma: "curatedEvent.upsert",
    when: "npm run publish-events (Serie A filter)",
  },
] as const;

export function logCuratedLifecycleInventory(): void {
  if (!isCuratedLifecycleForensicEnabled()) return;
  console.log(
    JSON.stringify({
      tag: "CURATED_LIFECYCLE_INVENTORY",
      writers: CURATED_LIFECYCLE_WRITERS,
      pipelineCaps: {
        CATALOG_TARGET_SIZE: 9,
        MAX_ACTIVE_API: 9,
        MAX_ACTIVE_CURATED_JOB: 9,
        BOOT_SEED_MAX: 9,
        rawFeedDbSyncCap: "env PREDICTIO_RAW_FEED_DB_CAP default 800",
      },
      note: "Default: protocol registry persists all valid rows; editorial-only flag caps at 9",
    }),
  );
}
