import type { AzuroMarket } from "~/services/azuro";

const DEFAULT_HOME_MIN = 9;

function kickoffMs(m: AzuroMarket): number {
  const t = Date.parse(m.event?.startsAt ?? "");
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/**
 * Homepage view layer: never show fewer than `min` markets when the registry has enough OPEN rows.
 */
export function ensureHomepageMinimumMarkets(
  ranked: readonly AzuroMarket[],
  registryPool: readonly AzuroMarket[],
  min: number = DEFAULT_HOME_MIN,
): AzuroMarket[] {
  if (ranked.length >= min) return [...ranked];
  const seen = new Set(ranked.map((m) => m.azuroGameId ?? m.id));
  const out = [...ranked];
  const fallback = [...registryPool].sort((a, b) => kickoffMs(a) - kickoffMs(b));
  for (const m of fallback) {
    if (out.length >= min) break;
    const key = m.azuroGameId ?? m.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export function sortRegistryForHomepage(markets: readonly AzuroMarket[]): AzuroMarket[] {
  return [...markets].sort((a, b) => kickoffMs(a) - kickoffMs(b));
}
