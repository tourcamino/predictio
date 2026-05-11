/**
 * Football seed markets → Azuro-shaped payloads for demo / empty API fallback.
 * Kept separate from `services/azuro.ts` so client bundles never pull `~/server/env`.
 */
import { SEED_MARKETS } from "~/data/seedMarkets";
import { MAX_FOOTBALL_MARKETS } from "~/constants/azuro";
import type { AzuroMarket } from "~/services/azuro";

const PRIORITY_LEAGUE_MARKERS = [
  "champions league",
  "premier league",
  "serie a",
  "la liga",
  "bundesliga",
  "ligue 1",
  "europa league",
  "eredivisie",
] as const;

function leaguePriorityScore(competition: string): number {
  const n = competition.toLowerCase();
  let best = 0;
  PRIORITY_LEAGUE_MARKERS.forEach((marker, i) => {
    if (n.includes(marker)) {
      best = Math.max(best, (PRIORITY_LEAGUE_MARKERS.length - i) * 1_000_000);
    }
  });
  return best;
}

function interestScore(m: AzuroMarket): number {
  return leaguePriorityScore(m.competition) + m.volume24h;
}

/** Hours until kickoff from normalized market payload */
export function hoursUntilStartMarket(m: AzuroMarket): number {
  const t = new Date(m.event.startsAt).getTime();
  return (t - Date.now()) / (1000 * 60 * 60);
}

/**
 * Exactly {@link MAX_FOOTBALL_MARKETS}: 3 imminent (≤48h), 3 medium (48h–7d), 3 long (7–14d),
 * prioritising major leagues + volume; backfills if a bucket is short.
 */
export function pickTieredFootballMarkets(markets: AzuroMarket[]): AzuroMarket[] {
  const valid = markets.filter((m) => {
    if (m.sport !== "football") return false;
    const h = hoursUntilStartMarket(m);
    return h > 0 && h <= 336;
  });

  const byInterest = (a: AzuroMarket, b: AzuroMarket) =>
    interestScore(b) - interestScore(a);

  const imminent = valid
    .filter((m) => {
      const h = hoursUntilStartMarket(m);
      return h > 0 && h <= 48;
    })
    .sort(byInterest);

  const medium = valid
    .filter((m) => {
      const h = hoursUntilStartMarket(m);
      return h > 48 && h <= 168;
    })
    .sort(byInterest);

  const longT = valid
    .filter((m) => {
      const h = hoursUntilStartMarket(m);
      return h > 168 && h <= 336;
    })
    .sort(byInterest);

  const picked: AzuroMarket[] = [
    ...imminent.slice(0, 3),
    ...medium.slice(0, 3),
    ...longT.slice(0, 3),
  ];

  const used = new Set(picked.map((p) => p.id));
  if (picked.length < MAX_FOOTBALL_MARKETS) {
    for (const m of [...valid].sort(byInterest)) {
      if (picked.length >= MAX_FOOTBALL_MARKETS) break;
      if (!used.has(m.id)) {
        picked.push(m);
        used.add(m.id);
      }
    }
  }

  return picked.slice(0, MAX_FOOTBALL_MARKETS);
}

/** Map SEED_MARKETS to AzuroMarket format for fallback (client-safe). */
export function getFootballSeedMarketsAsAzuro(): AzuroMarket[] {
  const mapped = SEED_MARKETS.filter((m) => m.sport === "football").map(
    (market) => ({
      ...market,
      azuroGameId: undefined,
      azuroConditionId: undefined,
      azuroStatus: undefined,
    }),
  );
  const tiered = pickTieredFootballMarkets(mapped);
  if (tiered.length > 0) return tiered;
  return mapped.slice(0, MAX_FOOTBALL_MARKETS);
}
