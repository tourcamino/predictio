import type { Analyst, AffiliateContact, AffiliateNetwork } from "~/types/affiliate";

/**
 * COPY MARKET SEED — three differentiated analyst personas for early-stage copy UX.
 * Wallets are valid 0x + 40 hex; DB seed + trade seed reference these addresses.
 */
export const mockAnalysts: Analyst[] = [
  {
    id: "copy_seed_conservative",
    wallet: "0x7d9e4f2a8c1b563094e7f2d8a1c4b9063758192f4",
    displayName: "TopFiveTom",
    avatar: "🎯",
    bio: "Mostly PL / La Liga. Fewer tickets, smaller sizes — trying not to turn picks into noise.",
    featuredQuote:
      "Still figuring out what consistently works here; posting trades so friends can follow along.",
    sport: ["Football"],
    verificationTier: null,
    roi: 9.2,
    winRate: 64,
    totalPredictions: 14,
    avgOdds: 1.82,
    followersCount: 6,
    volumeGenerated: 4200,
    pendingRewards: 42,
    totalEarned: 186,
    autoCompound: false,
    activityDays: 52,
    validFollowers: 4,
    onchainRegistered: false,
    referralCode: "PREDICTIO-CONS-9X2A",
  },
  {
    id: "copy_seed_aggressive",
    wallet: "0x9b3c8e1f7a2d465089c4e2b7f1a5069384758291c",
    displayName: "EdgeRunner_Neo",
    avatar: "⚡",
    bio: "Higher churn on football cards with occasional UFC spots. Wins and bruises both show up — size varies with conviction.",
    featuredQuote:
      "Paper trading first; sizing down after rough weeks. Nothing here is financial advice.",
    sport: ["Football", "MMA"],
    verificationTier: null,
    roi: 14.8,
    winRate: 56,
    totalPredictions: 34,
    avgOdds: 2.38,
    followersCount: 11,
    volumeGenerated: 7800,
    pendingRewards: 61,
    totalEarned: 248,
    autoCompound: false,
    activityDays: 41,
    validFollowers: 7,
    onchainRegistered: false,
    referralCode: "PREDICTIO-AGGR-7KQ4",
  },
  {
    id: "copy_seed_value",
    wallet: "0x4f6e2d9c8b1a073649f5e3d2c8b1a907564839201f",
    displayName: "FadePublic_Nika",
    avatar: "📉",
    bio: "Looks for mispriced football sides when the board feels stretched. Win rate is mediocre; payoff asymmetry matters more.",
    featuredQuote:
      "Care more about payoff skew than headline win rate — boring but keeps sizing sane.",
    sport: ["Football"],
    verificationTier: null,
    roi: 11.3,
    winRate: 54,
    totalPredictions: 22,
    avgOdds: 2.74,
    followersCount: 4,
    volumeGenerated: 5100,
    pendingRewards: 28,
    totalEarned: 132,
    autoCompound: false,
    activityDays: 63,
    validFollowers: 3,
    onchainRegistered: false,
    referralCode: "PREDICTIO-VALUE-3LM9",
  },
];

/**
 * Copy-seed “recent activity” when DB orders are absent.
 * Strings MUST match `Market.event` from seeded `mockMarkets` (paper persistence) so cards match real platform rows.
 */
export const COPY_SEED_PLATFORM_EVENTS = {
  MANCHESTER_CITY_VS_ARSENAL: "Manchester City vs Arsenal",
  INTER_VS_FC_BARCELONA: "Inter Milan vs FC Barcelona",
  INTER_VS_AC_MILAN: "Inter Milan vs AC Milan",
  DJOKOVIC_VS_ALCARAZ: "Novak Djokovic vs Carlos Alcaraz",
  REAL_MADRID_VS_FC_BARCELONA: "Real Madrid vs FC Barcelona",
  BAYERN_VS_DORTMUND: "Bayern Munich vs Borussia Dortmund",
  /** Aligns with paper `mockMarkets` / typical DB UFC line for MMA persona rows */
  UFC_PEREIRA_ANKALAEV: "Pereira vs Ankalaev",
} as const;

/** Prefer these when attaching seed `Order` rows to markets (subset order = tie-break). */
export const COPY_SEED_MARKET_SORT_SUBSTRINGS: readonly string[] = [
  COPY_SEED_PLATFORM_EVENTS.MANCHESTER_CITY_VS_ARSENAL,
  COPY_SEED_PLATFORM_EVENTS.BAYERN_VS_DORTMUND,
  COPY_SEED_PLATFORM_EVENTS.INTER_VS_FC_BARCELONA,
  COPY_SEED_PLATFORM_EVENTS.INTER_VS_AC_MILAN,
  COPY_SEED_PLATFORM_EVENTS.REAL_MADRID_VS_FC_BARCELONA,
  COPY_SEED_PLATFORM_EVENTS.UFC_PEREIRA_ANKALAEV,
  COPY_SEED_PLATFORM_EVENTS.DJOKOVIC_VS_ALCARAZ,
];

export type CopySeedRecentTrade = {
  event: string;
  /** Token side shown on card */
  side: "YES" | "NO";
  stakeUsd: number;
  result: "Won" | "Lost";
  profitUsd: number;
  daysAgo: number;
  /** When set, overrides analyst primary sport for this row (e.g. tennis on a football profile). */
  sport?: string;
};

/**
 * Recent paper trades for the three copy-seed personas ($50–$500, WIN/LOSS mix).
 * Keys: lowercase wallet.
 */
export const copySeedRecentTradesByWallet: Record<string, CopySeedRecentTrade[]> = {
  [mockAnalysts[0]!.wallet.toLowerCase()]: [
    {
      event: COPY_SEED_PLATFORM_EVENTS.MANCHESTER_CITY_VS_ARSENAL,
      side: "YES",
      stakeUsd: 180,
      result: "Won",
      profitUsd: 112,
      daysAgo: 2,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.INTER_VS_AC_MILAN,
      side: "NO",
      stakeUsd: 95,
      result: "Lost",
      profitUsd: -95,
      daysAgo: 5,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.BAYERN_VS_DORTMUND,
      side: "NO",
      stakeUsd: 240,
      result: "Lost",
      profitUsd: -240,
      daysAgo: 9,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.REAL_MADRID_VS_FC_BARCELONA,
      side: "YES",
      stakeUsd: 310,
      result: "Won",
      profitUsd: 178,
      daysAgo: 14,
    },
  ],
  [mockAnalysts[1]!.wallet.toLowerCase()]: [
    {
      event: COPY_SEED_PLATFORM_EVENTS.BAYERN_VS_DORTMUND,
      side: "YES",
      stakeUsd: 420,
      result: "Won",
      profitUsd: 265,
      daysAgo: 1,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.MANCHESTER_CITY_VS_ARSENAL,
      side: "NO",
      stakeUsd: 155,
      result: "Lost",
      profitUsd: -155,
      daysAgo: 4,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.UFC_PEREIRA_ANKALAEV,
      side: "NO",
      stakeUsd: 220,
      result: "Won",
      profitUsd: 118,
      daysAgo: 7,
      sport: "MMA",
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.BAYERN_VS_DORTMUND,
      side: "YES",
      stakeUsd: 72,
      result: "Won",
      profitUsd: 41,
      daysAgo: 11,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.INTER_VS_FC_BARCELONA,
      side: "YES",
      stakeUsd: 260,
      result: "Won",
      profitUsd: 140,
      daysAgo: 18,
    },
  ],
  [mockAnalysts[2]!.wallet.toLowerCase()]: [
    {
      event: COPY_SEED_PLATFORM_EVENTS.INTER_VS_FC_BARCELONA,
      side: "NO",
      stakeUsd: 200,
      result: "Won",
      profitUsd: 155,
      daysAgo: 3,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.MANCHESTER_CITY_VS_ARSENAL,
      side: "NO",
      stakeUsd: 88,
      result: "Lost",
      profitUsd: -88,
      daysAgo: 6,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.BAYERN_VS_DORTMUND,
      side: "YES",
      stakeUsd: 340,
      result: "Won",
      profitUsd: 210,
      daysAgo: 10,
    },
    {
      event: COPY_SEED_PLATFORM_EVENTS.REAL_MADRID_VS_FC_BARCELONA,
      side: "NO",
      stakeUsd: 125,
      result: "Lost",
      profitUsd: -125,
      daysAgo: 16,
    },
  ],
};

export function getCopySeedLatestTradeLabel(wallet: string): string | null {
  const rows = copySeedRecentTradesByWallet[wallet.toLowerCase()];
  const t = rows?.[0];
  return t ? `${t.event} · ${t.side}` : null;
}

export function getCopySeedPredictionHistoryRows(
  wallet: string,
  sportFallback: string,
): Array<{
  id: string;
  event: string;
  sport: string;
  odds: number;
  stake: number;
  outcome: string;
  profit: number;
  copiedBy: number;
  timestamp: number;
}> {
  const rows = copySeedRecentTradesByWallet[wallet.toLowerCase()];
  if (!rows?.length) return [];
  const now = Date.now();
  return rows.map((r, i) => ({
    id: `copy-seed-${wallet.slice(2, 10)}-${i}`,
    event: r.event,
    sport: r.sport ?? (sportFallback || "Football"),
    odds: r.side === "YES" ? 1.85 : 2.05,
    stake: r.stakeUsd,
    outcome: r.result === "Won" ? "Won" : "Lost",
    profit: r.profitUsd,
    copiedBy: 3 + (i % 5),
    timestamp: now - r.daysAgo * 86400000,
  }));
}

export const mockAffiliateContacts: AffiliateContact[] = [
  {
    id: "c001",
    name: "FootballGuru UK",
    type: "creator",
    sport: ["Football"],
    platform: "YouTube",
    followers: "2.1M",
    region: "UK",
    handles: {
      x: "@FootballGuru",
      email: "collab@footballguru.com",
      youtube: "youtube.com/@FootballGuru",
    },
    stage: "contacted",
    priority: "high",
    fitScore: 91,
    estimatedValue: "$45K vol/month",
    interactions: [
      {
        date: Date.now() - 86400000 * 3,
        channel: "X DM",
        goal: "Introduce affiliate program",
        message: "Hey — loved your El Clasico breakdown...",
        status: "sent",
      },
    ],
    notes: "Very engaged football audience. Mentioned crypto before.",
    addedAt: Date.now() - 86400000 * 5,
  },
  {
    id: "c002",
    name: "MMA Weekly Podcast",
    type: "podcast",
    sport: ["MMA"],
    platform: "Spotify",
    followers: "84K listeners",
    region: "USA",
    handles: {
      x: "@MMAWeeklyPod",
      email: "ads@mmaweekly.com",
    },
    stage: "identified",
    priority: "high",
    fitScore: 84,
    estimatedValue: "$18K vol/month",
    interactions: [],
    notes: "Weekly UFC preview episodes, very analytical.",
    addedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "c003",
    name: "BettingInsider Network",
    type: "network",
    sport: ["Football", "MMA", "Tennis"],
    platform: "Web",
    followers: "2,400 affiliates",
    region: "EU",
    handles: {
      email: "partnerships@bettinginsider.com",
      linkedin: "linkedin.com/company/bettinginsider",
    },
    stage: "replied",
    priority: "high",
    fitScore: 88,
    estimatedValue: "$200K+ vol/month",
    interactions: [
      {
        date: Date.now() - 86400000,
        channel: "Email",
        goal: "Network partnership",
        message: "Hi, I'm reaching out from Predictio.live...",
        status: "replied",
      },
    ],
    notes: "Interested in DeFi vertical. Waiting for proposal.",
    addedAt: Date.now() - 86400000 * 7,
  },
  {
    id: "c004",
    name: "CricketGuru Official",
    type: "creator",
    sport: ["Cricket"],
    platform: "Instagram",
    followers: "890K",
    region: "India",
    handles: {
      x: "@CricketGuru",
      instagram: "@cricketguru_official",
    },
    stage: "identified",
    priority: "high",
    fitScore: 79,
    estimatedValue: "$35K vol/month",
    interactions: [],
    notes: "Huge Indian cricket audience. IPL season = perfect timing.",
    addedAt: Date.now() - 86400000,
  },
  {
    id: "c005",
    name: "SportsTech Media",
    type: "media",
    sport: ["Football", "Basketball"],
    platform: "Web",
    followers: "450K readers/month",
    region: "Global",
    handles: {
      email: "editorial@sportstech.io",
      x: "@SportsTechMedia",
    },
    stage: "negotiating",
    priority: "medium",
    fitScore: 72,
    estimatedValue: "$25K vol/month",
    interactions: [
      {
        date: Date.now() - 86400000 * 10,
        channel: "Email",
        goal: "Content partnership",
        message: "Hi SportsTech team...",
        status: "replied",
      },
    ],
    notes: "Want to do sponsored prediction market articles.",
    addedAt: Date.now() - 86400000 * 12,
  },
];

export const mockNetworks: AffiliateNetwork[] = [
  {
    id: "n001",
    name: "BettingInsider Network",
    website: "bettinginsider.com",
    reach: "2,400 affiliates · 15M users",
    affiliatesCount: 2400,
    verticals: ["Football", "MMA", "Tennis", "Casino"],
    contact: "partnerships@bettinginsider.com",
    proposedRevShare: 20,
    stage: "negotiating",
    notes: "Interested in DeFi vertical. Need formal proposal.",
  },
  {
    id: "n002",
    name: "CryptoAff Pro",
    website: "cryptoaff.pro",
    reach: "800 affiliates · crypto-native",
    affiliatesCount: 800,
    verticals: ["Crypto", "DeFi", "Sports"],
    contact: "bd@cryptoaff.pro",
    proposedRevShare: 25,
    stage: "identified",
    notes: "Perfect DeFi audience. Need to reach out.",
  },
];
