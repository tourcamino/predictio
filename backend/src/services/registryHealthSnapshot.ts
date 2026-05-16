/**
 * In-memory registry metrics (updated on sync / API / scheduler).
 * Used by REGISTRY_HEALTH_CHECK without re-fetching Azuro on every probe.
 */

export type RegistryHealthSnapshot = {
  updatedAt: string;
  source: string;
  rawFeedCount: number | null;
  normalizedCount: number | null;
  persistedCount: number | null;
  openRegistryCount: number | null;
  apiResponseCount: number | null;
};

let lastSnapshot: RegistryHealthSnapshot | null = null;
let previousOpenRegistryCount: number | null = null;

export function recordRegistryHealthMetrics(
  partial: Omit<RegistryHealthSnapshot, "updatedAt"> & { updatedAt?: string },
): void {
  const open = partial.openRegistryCount;
  if (typeof open === "number" && Number.isFinite(open)) {
    if (lastSnapshot?.openRegistryCount != null) {
      previousOpenRegistryCount = lastSnapshot.openRegistryCount;
    }
  }
  lastSnapshot = {
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
    source: partial.source,
    rawFeedCount: partial.rawFeedCount ?? null,
    normalizedCount: partial.normalizedCount ?? null,
    persistedCount: partial.persistedCount ?? null,
    openRegistryCount: partial.openRegistryCount ?? null,
    apiResponseCount: partial.apiResponseCount ?? null,
  };
}

export function getLastRegistryHealthSnapshot(): RegistryHealthSnapshot | null {
  return lastSnapshot;
}

export function getPreviousOpenRegistryCount(): number | null {
  return previousOpenRegistryCount;
}
