import { mockAnalysts } from "~/data/mockAffiliates";

export type AutonomousAnalystKind = "conservative" | "aggressive" | "value";

export interface AutonomousAnalystProfile {
  wallet: string;
  displayName: string;
  kind: AutonomousAnalystKind;
  /** Max simultaneous open orders */
  maxOpen: number;
  /** Max new opens per UTC day (excluding seed-copy-* ids) */
  maxNewTradesPerDay: number;
  stakeMin: number;
  stakeMax: number;
  /** Fraction of pool that should be football-first (rest = secondary sports) */
  footballWeight: number;
  /** Per tick probability of attempting a new trade when under caps */
  attemptProbability: number;
  /** Skip YES price outside [min, max] for conservative / value */
  avoidExtremeLow: number;
  avoidExtremeHigh: number;
}

const W = (i: number) => mockAnalysts[i]!.wallet.toLowerCase();
const N = (i: number) => mockAnalysts[i]!.displayName;

/** Behavioral config for the three copy-seed analysts (wallets from mockAffiliates). */
export const AUTONOMOUS_COPY_ANALYST_PROFILES: AutonomousAnalystProfile[] = [
  {
    wallet: W(0),
    displayName: N(0),
    kind: "conservative",
    maxOpen: 3,
    maxNewTradesPerDay: 4,
    stakeMin: 18,
    stakeMax: 48,
    footballWeight: 0.92,
    attemptProbability: 0.04,
    avoidExtremeLow: 0.2,
    avoidExtremeHigh: 0.8,
  },
  {
    wallet: W(1),
    displayName: N(1),
    kind: "aggressive",
    maxOpen: 4,
    maxNewTradesPerDay: 6,
    stakeMin: 28,
    stakeMax: 115,
    footballWeight: 0.72,
    attemptProbability: 0.07,
    avoidExtremeLow: 0.08,
    avoidExtremeHigh: 0.92,
  },
  {
    wallet: W(2),
    displayName: N(2),
    kind: "value",
    maxOpen: 4,
    maxNewTradesPerDay: 5,
    stakeMin: 24,
    stakeMax: 88,
    footballWeight: 0.78,
    attemptProbability: 0.05,
    avoidExtremeLow: 0.12,
    avoidExtremeHigh: 0.88,
  },
];

/** League / sport hints for prioritising football (EU focus). */
export const FOOTBALL_LEAGUE_HINTS = [
  "champions",
  "ucl",
  "europa",
  "serie a",
  "premier",
  "la liga",
  "laliga",
  "coppa italia",
  "bundesliga",
  "ligue 1",
  "eredivisie",
  "world cup",
  "euro",
  "facup",
  "copa del rey",
];

export function isFootballWeightedMarket(sport: string, league: string): boolean {
  const s = sport.toLowerCase();
  const l = league.toLowerCase();
  if (s.includes("football") || s.includes("soccer")) return true;
  return FOOTBALL_LEAGUE_HINTS.some((h) => l.includes(h));
}

export function isSecondarySportOk(sport: string): boolean {
  const s = sport.toLowerCase();
  return (
    s.includes("mma") ||
    s.includes("basketball") ||
    s.includes("nba") ||
    s.includes("tennis")
  );
}
