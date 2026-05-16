import type { AzuroMarket } from "~/services/azuro";
import { FOOTBALL_FOCUS_CONFIG, isFootballFocusEnabled } from "~/config/footballFocus";

const DEFAULT_HOME_MIN = 9;

function kickoffMs(m: AzuroMarket): number {
  const t = Date.parse(m.event?.startsAt ?? "");
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

export function isFootballMarket(m: Pick<AzuroMarket, "sport">): boolean {
  const s = (m.sport ?? "").trim().toLowerCase();
  return s === "football" || s === "soccer";
}

function leagueBoost(competition: string): number {
  const c = competition.toLowerCase();
  let boost = 0;
  for (const name of FOOTBALL_FOCUS_CONFIG.PRIORITY_COMPETITIONS) {
    if (c.includes(name.toLowerCase())) {
      boost += 20;
      break;
    }
  }
  if (/champions league|serie a|premier league|la liga|bundesliga|veikkausliiga|eredivisie|ligue 1/i.test(c)) {
    boost += 8;
  }
  return boost;
}

/** View-only ranking: football first, top leagues, then kickoff proximity. */
export function rankFootballFirstForView(markets: readonly AzuroMarket[]): AzuroMarket[] {
  const now = Date.now();
  return [...markets].sort((a, b) => {
    const af = isFootballMarket(a);
    const bf = isFootballMarket(b);
    if (af !== bf) return af ? -1 : 1;

    const qualityA =
      leagueBoost(a.competition) +
      (a.importanceScore ?? 0) +
      (a.paperLiquidityAllocation ?? 0) / 500;
    const qualityB =
      leagueBoost(b.competition) +
      (b.importanceScore ?? 0) +
      (b.paperLiquidityAllocation ?? 0) / 500;
    if (qualityA !== qualityB) return qualityB - qualityA;

    const horizonA = kickoffMs(a) - now;
    const horizonB = kickoffMs(b) - now;
    if (horizonA >= 0 && horizonB >= 0 && Math.abs(horizonA - horizonB) > 3_600_000) {
      return horizonA - horizonB;
    }
    return kickoffMs(a) - kickoffMs(b);
  });
}

/**
 * Homepage view: football-first ordering; multisport fallback only below min visible count.
 */
export function buildFootballFirstHomepageView(
  registryPool: readonly AzuroMarket[],
  displayCap: number = DEFAULT_HOME_MIN,
  minVisible: number = DEFAULT_HOME_MIN,
): AzuroMarket[] {
  const ranked = isFootballFocusEnabled()
    ? rankFootballFirstForView(registryPool)
    : [...registryPool].sort((a, b) => kickoffMs(a) - kickoffMs(b));

  const football = ranked.filter(isFootballMarket);
  const nonFootball = ranked.filter((m) => !isFootballMarket(m));

  const primary = football.length >= minVisible ? football : [...football, ...nonFootball];

  const seen = new Set<string>();
  const out: AzuroMarket[] = [];
  for (const m of primary) {
    if (out.length >= displayCap) break;
    const key = m.azuroGameId ?? m.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }

  if (out.length >= minVisible) return out.slice(0, displayCap);

  for (const m of ranked) {
    if (out.length >= minVisible) break;
    const key = m.azuroGameId ?? m.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }

  return out.slice(0, displayCap);
}
