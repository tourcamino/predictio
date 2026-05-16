/**
 * Copy-seed personas (must match `src/data/mockAffiliates.ts` wallets).
 * Backend cannot import frontend modules — keep in sync when seed changes.
 */

export type CopySeedAnalyst = {
  id: string;
  wallet: string;
  displayName: string;
  avatar: string;
  bio: string;
  sport: string[];
  roi: number;
  winRate: number;
  totalPredictions: number;
  avgOdds: number;
  followersCount: number;
  volumeGenerated: number;
  pendingRewards: number;
  totalEarned: number;
  autoCompound: boolean;
  activityDays: number;
  validFollowers: number;
  onchainRegistered: boolean;
  referralCode: string;
  verificationTier: string | null;
};

export const COPY_SEED_ANALYSTS: CopySeedAnalyst[] = [
  {
    id: "copy_seed_conservative",
    wallet: "0x7d9e4f2a8c1b563094e7f2d8a1c4b9063758192f4",
    displayName: "TopFiveTom",
    avatar: "🎯",
    bio: "Mostly PL / La Liga. Fewer tickets, smaller sizes — trying not to turn picks into noise.",
    sport: ["Soccer"],
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
    verificationTier: null,
  },
  {
    id: "copy_seed_aggressive",
    wallet: "0x9b3c8e1f7a2d465089c4e2b7f1a5069384758291c",
    displayName: "EdgeRunner_Neo",
    avatar: "⚡",
    bio: "Higher churn on football match cards. Wins and bruises both show up — size varies with conviction.",
    sport: ["Soccer"],
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
    verificationTier: null,
  },
  {
    id: "copy_seed_value",
    wallet: "0x4f6e2d9c8b1a073649f5e3d2c8b1a907564839201f",
    displayName: "FadePublic_Nika",
    avatar: "📉",
    bio: "Looks for mispriced sides when the board feels stretched. Win rate is mediocre; payoff asymmetry matters more.",
    sport: ["Soccer"],
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
    verificationTier: null,
  },
];

const COPY_SEED_LATEST_LABEL: Record<string, string> = {
  "0x7d9e4f2a8c1b563094e7f2d8a1c4b9063758192f4":
    "Manchester City vs Arsenal · YES",
  "0x9b3c8e1f7a2d465089c4e2b7f1a5069384758291c":
    "Bayern Munich vs Borussia Dortmund · YES",
  "0x4f6e2d9c8b1a073649f5e3d2c8b1a907564839201f":
    "Inter Milan vs FC Barcelona · NO",
};

export function getCopySeedLatestTradeLabel(wallet: string): string | null {
  return COPY_SEED_LATEST_LABEL[wallet.toLowerCase()] ?? null;
}

export const COPY_SEED_WALLETS = new Set(
  COPY_SEED_ANALYSTS.map((a) => a.wallet.toLowerCase()),
);
