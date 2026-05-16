/**
 * REGISTRY_HEALTH_CHECK — anti-regression probes for protocol registry mode.
 * Logs `REGISTRY_HEALTH_CHECK` JSON; surfaces alerts on /api/v1/health and admin full health.
 */
import type { PrismaClient } from "@prisma/client";
import {
  homepageMinMarkets,
  isProtocolRegistryMode,
} from "./emergencyRelaxMode";
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

export async function runRegistryHealthCheck(
  prisma: PrismaClient,
  source = "scheduled",
): Promise<RegistryHealthCheckResult> {
  const minRequired = homepageMinMarkets();
  const protocolRegistryMode = isProtocolRegistryMode();
  const openRegistryCount = await prisma.curatedEvent.count({
    where: { isActive: true, status: "OPEN" },
  });

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
  };

  if (alerts.length > 0 || source === "scheduled") {
    console.log(JSON.stringify(result));
  }

  return result;
}
