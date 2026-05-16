/**
 * REGISTRY_HEALTH_CHECK — anti-regression probes for protocol registry mode.
 * Logs `REGISTRY_HEALTH_CHECK` JSON; surfaces alerts on /api/v1/health and admin full health.
 */
import type { PrismaClient } from "@prisma/client";
import {
  homepageMinMarkets,
  isProtocolRegistryMode,
} from "./emergencyRelaxMode";
import { isFootballSportSlug } from "./canonicalSportTaxonomy";
import {
  assertFootballFirstGuards,
  checkPrePersistenceSportFilter,
  scanFootballFirstGuardViolations,
} from "./footballFirstGuards";
import { CANONICAL_OPEN_MARKET_CAP } from "./canonicalLiquidityState";
import {
  getLastRegistryHealthSnapshot,
  getPreviousOpenRegistryCount,
  recordRegistryHealthMetrics,
} from "./registryHealthSnapshot";

export type RegistryHealthAlert = {
  code: string;
  severity: "warn" | "critical";
  message: string;
  details?: Record<string, unknown>;
};

export type FootballFirstMetrics = {
  FOOTBALL_OPEN_COUNT: number;
  NON_FOOTBALL_REGISTRY_COUNT: number;
  FOOTBALL_API_COUNT: number | null;
  FOOTBALL_HOMEPAGE_COUNT: number | null;
  FOOTBALL_LP_ALLOCATED_COUNT: number | null;
};

export type RegistryHealthCheckResult = {
  tag: "REGISTRY_HEALTH_CHECK";
  at: string;
  protocolRegistryMode: boolean;
  ok: boolean;
  openRegistryCount: number;
  rawFeedCount: number | null;
  apiResponseCount: number | null;
  minRequired: number;
  alerts: RegistryHealthAlert[];
  snapshotAgeSec: number | null;
  footballFirst: FootballFirstMetrics;
};

const RAW_OPEN_GAP_RATIO = 0.5;
const RAW_OPEN_GAP_MIN_DELTA = 10;
const COLLAPSE_RATIO = 0.5;

function buildAlerts(opts: {
  openCount: number;
  minRequired: number;
  rawFeed: number | null;
  apiCount: number | null;
  previousOpen: number | null;
}): RegistryHealthAlert[] {
  const alerts: RegistryHealthAlert[] = [];
  const { openCount, minRequired, rawFeed, apiCount, previousOpen } = opts;

  if (openCount < minRequired) {
    alerts.push({
      code: "OPEN_REGISTRY_BELOW_MIN",
      severity: "critical",
      message: `OPEN registry count ${openCount} < minimum ${minRequired}`,
      details: { openRegistryCount: openCount, minRequired },
    });
  }

  if (
    rawFeed != null &&
    rawFeed >= minRequired &&
    openCount < rawFeed * RAW_OPEN_GAP_RATIO &&
    rawFeed - openCount >= RAW_OPEN_GAP_MIN_DELTA
  ) {
    alerts.push({
      code: "RAW_FEED_REGISTRY_GAP",
      severity: "warn",
      message: `RAW_FEED_COUNT (${rawFeed}) >> OPEN_REGISTRY_COUNT (${openCount})`,
      details: { rawFeedCount: rawFeed, openRegistryCount: openCount },
    });
  }

  if (apiCount != null && apiCount < minRequired) {
    alerts.push({
      code: "API_RESPONSE_BELOW_MIN",
      severity: "critical",
      message: `API_RESPONSE_COUNT (${apiCount}) < minimum ${minRequired}`,
      details: { apiResponseCount: apiCount, minRequired },
    });
  }

  if (
    previousOpen != null &&
    previousOpen >= minRequired &&
    openCount < previousOpen * COLLAPSE_RATIO &&
    openCount < minRequired
  ) {
    alerts.push({
      code: "OPEN_REGISTRY_SUDDEN_COLLAPSE",
      severity: "critical",
      message: `OPEN count collapsed ${previousOpen} → ${openCount}`,
      details: { previousOpenRegistryCount: previousOpen, openRegistryCount: openCount },
    });
  }

  return alerts;
}

async function countFootballOpen(prisma: PrismaClient): Promise<number> {
  return prisma.curatedEvent.count({
    where: {
      isActive: true,
      status: "OPEN",
      OR: [{ sportSlug: "football" }, { sportSlug: "soccer" }, { sport: "football" }],
    },
  });
}

export async function runRegistryHealthCheck(
  prisma: PrismaClient,
  source = "scheduled",
): Promise<RegistryHealthCheckResult> {
  const minRequired = homepageMinMarkets();
  const protocolRegistryMode = isProtocolRegistryMode();
  const openRegistryCount = await prisma.curatedEvent.count({
    where: { isActive: true, status: "OPEN" },
  });
  const footballOpenCount = await countFootballOpen(prisma);

  const snap = getLastRegistryHealthSnapshot();
  const rawFeedCount = snap?.rawFeedCount ?? null;
  const apiResponseCount = snap?.apiResponseCount ?? null;
  const previousOpen = getPreviousOpenRegistryCount();

  recordRegistryHealthMetrics({
    source: `health_check:${source}`,
    rawFeedCount,
    normalizedCount: snap?.normalizedCount ?? null,
    persistedCount: snap?.persistedCount ?? null,
    openRegistryCount,
    apiResponseCount,
  });

  const alerts: RegistryHealthAlert[] = protocolRegistryMode
    ? buildAlerts({
        openCount: openRegistryCount,
        minRequired,
        rawFeed: rawFeedCount,
        apiCount: apiResponseCount,
        previousOpen,
      })
    : [
        {
          code: "EDITORIAL_CATALOG_ONLY",
          severity: "warn" as const,
          message:
            "PREDICTIO_EDITORIAL_CATALOG_ONLY is enabled — protocol registry checks are advisory only",
        },
      ];

  if (protocolRegistryMode && footballOpenCount < minRequired && openRegistryCount >= minRequired) {
    alerts.push({
      code: "FOOTBALL_OPEN_BELOW_HOMEPAGE_MIN",
      severity: "warn",
      message: `Football OPEN (${footballOpenCount}) < homepage min (${minRequired}) — multisport fallback will surface`,
      details: { footballOpenCount, openRegistryCount, minRequired },
    });
  }

  const staticGuardViolations = scanFootballFirstGuardViolations();
  for (const v of staticGuardViolations) {
    alerts.push({
      code: v.code,
      severity: "critical",
      message: v.detail,
      details: { file: v.file },
    });
  }

  const prePersistViolation = checkPrePersistenceSportFilter({
    payloadGames: snap?.normalizedCount ?? rawFeedCount ?? 0,
    persistedCount: snap?.persistedCount ?? 0,
    sportFilterApplied: false,
  });
  if (prePersistViolation) {
    alerts.push({
      code: prePersistViolation.code,
      severity: "critical",
      message: prePersistViolation.detail,
    });
  }

  if (source === "scheduled" || source.includes("health")) {
    try {
      assertFootballFirstGuards();
    } catch (e) {
      alerts.push({
        code: "FOOTBALL_FIRST_GUARD_ASSERT",
        severity: "critical",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const lpFootballRows = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: { sportSlug: true, sport: true },
    take: CANONICAL_OPEN_MARKET_CAP * 4,
  });
  const footballFirstSlots = [...lpFootballRows]
    .filter((r) => isFootballSportSlug(r.sportSlug ?? r.sport))
    .slice(0, CANONICAL_OPEN_MARKET_CAP);

  const footballFirst: FootballFirstMetrics = {
    FOOTBALL_OPEN_COUNT: footballOpenCount,
    NON_FOOTBALL_REGISTRY_COUNT: Math.max(0, openRegistryCount - footballOpenCount),
    FOOTBALL_API_COUNT: apiResponseCount,
    FOOTBALL_HOMEPAGE_COUNT: Math.min(minRequired, footballOpenCount),
    FOOTBALL_LP_ALLOCATED_COUNT: Math.min(
      CANONICAL_OPEN_MARKET_CAP,
      footballFirstSlots.length,
    ),
  };

  const snapshotAgeSec = snap?.updatedAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(snap.updatedAt)) / 1000))
    : null;

  const result: RegistryHealthCheckResult = {
    tag: "REGISTRY_HEALTH_CHECK",
    at: new Date().toISOString(),
    protocolRegistryMode,
    ok: alerts.every((a) => a.severity !== "critical"),
    openRegistryCount,
    rawFeedCount,
    apiResponseCount,
    minRequired,
    alerts,
    snapshotAgeSec,
    footballFirst,
  };

  if (alerts.length > 0 || source === "scheduled" || source.includes("health")) {
    console.log(JSON.stringify({ ...result, tag: "REGISTRY_HEALTH_CHECK" }));
    console.log(JSON.stringify({ tag: "FOOTBALL_FIRST_METRICS", ...footballFirst }));
  }

  return result;
}
