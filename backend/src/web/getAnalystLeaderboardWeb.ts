import type { Analyst, PrismaClient } from "@prisma/client";
import {
  COPY_SEED_ANALYSTS,
  COPY_SEED_WALLETS,
  getCopySeedLatestTradeLabel,
  type CopySeedAnalyst,
} from "../lib/copySeedAnalysts";

function prismaLikeFromSeed(m: CopySeedAnalyst): Analyst {
  return {
    id: m.id,
    wallet: m.wallet,
    displayName: m.displayName,
    avatar: m.avatar,
    bio: m.bio,
    twitterUrl: null,
    telegramUrl: null,
    websiteUrl: null,
    sport: m.sport,
    roi: m.roi,
    winRate: m.winRate,
    totalPredictions: m.totalPredictions,
    avgOdds: m.avgOdds,
    followersCount: m.followersCount,
    volumeGenerated: m.volumeGenerated,
    pendingRewards: m.pendingRewards,
    totalEarned: m.totalEarned,
    autoCompound: m.autoCompound,
    activityDays: m.activityDays,
    validFollowers: m.validFollowers,
    onchainRegistered: m.onchainRegistered,
    referralCode: m.referralCode,
    isVerified: false,
    verifiedAt: null,
    verificationTier: m.verificationTier,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function compareRoiSignThenMagnitude(a: Analyst, b: Analyst): number {
  const aPos = a.roi >= 0;
  const bPos = b.roi >= 0;
  if (aPos !== bPos) return aPos ? -1 : 1;
  return b.roi - a.roi;
}

function sortCombined(
  rows: Analyst[],
  sortBy: "roi" | "winRate" | "followers" | "earned",
): void {
  rows.sort((a, b) => {
    let primary = 0;
    switch (sortBy) {
      case "roi":
        return compareRoiSignThenMagnitude(a, b);
      case "winRate":
        primary = b.winRate - a.winRate;
        if (primary !== 0) return primary;
        primary = compareRoiSignThenMagnitude(a, b);
        if (primary !== 0) return primary;
        return b.roi - a.roi;
      case "followers":
        primary = b.followersCount - a.followersCount;
        if (primary !== 0) return primary;
        primary = compareRoiSignThenMagnitude(a, b);
        if (primary !== 0) return primary;
        return b.roi - a.roi;
      case "earned":
      default:
        primary = b.totalEarned - a.totalEarned;
        if (primary !== 0) return primary;
        primary = compareRoiSignThenMagnitude(a, b);
        if (primary !== 0) return primary;
        return b.roi - a.roi;
    }
  });
}

export async function runGetAnalystLeaderboardWeb(
  prisma: PrismaClient,
  input: {
    limit?: number;
    sortBy?: "roi" | "winRate" | "followers" | "earned";
    currentUserWallet?: string;
  },
) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const sortBy = input.sortBy ?? "earned";
  const currentUserWallet = input.currentUserWallet?.toLowerCase();

  const dbAnalysts = await prisma.analyst.findMany({
    where: { totalPredictions: { gte: 5 } },
  });

  const dbWallets = new Set(dbAnalysts.map((a) => a.wallet.toLowerCase()));
  const mockExtras = COPY_SEED_ANALYSTS.filter(
    (m) => !dbWallets.has(m.wallet.toLowerCase()),
  ).map(prismaLikeFromSeed);

  const combined = [...dbAnalysts, ...mockExtras];
  sortCombined(combined, sortBy);
  const analysts = combined.slice(0, limit);

  const rankedLeaderboard = await Promise.all(
    analysts.map(async (analyst, index) => {
      const latest = await prisma.order.findFirst({
        where: { wallet: analyst.wallet.toLowerCase() },
        orderBy: { createdAt: "desc" },
        include: { market: { select: { event: true } } },
      });

      const seedLabel = getCopySeedLatestTradeLabel(analyst.wallet);
      const dbLabel = latest
        ? `${latest.market.event} · ${latest.outcome}`
        : null;
      const isSeed = COPY_SEED_WALLETS.has(analyst.wallet.toLowerCase());
      const latestTradeLabel = isSeed
        ? seedLabel ?? dbLabel
        : dbLabel ?? seedLabel;

      return {
        ...analyst,
        rank: index + 1,
        isCurrentUser: currentUserWallet
          ? analyst.wallet.toLowerCase() === currentUserWallet
          : false,
        latestTradeLabel,
      };
    }),
  );

  return {
    leaderboard: rankedLeaderboard,
    updatedAt: new Date().toISOString(),
    runtime: "express-vps",
  };
}
