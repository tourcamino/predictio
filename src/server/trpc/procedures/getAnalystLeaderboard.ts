import { z } from "zod";
import type { Analyst as PrismaAnalyst } from "@prisma/client";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  mockAnalysts,
  getCopySeedLatestTradeLabel,
} from "~/data/mockAffiliates";

function prismaLikeFromMock(
  m: (typeof mockAnalysts)[number],
): PrismaAnalyst {
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
    verificationTier: m.verificationTier ?? null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

/** Non‑negative ROI first (honest default for copy discovery), then higher ROI within each bucket. */
function compareRoiSignThenMagnitude(a: PrismaAnalyst, b: PrismaAnalyst): number {
  const aPos = a.roi >= 0;
  const bPos = b.roi >= 0;
  if (aPos !== bPos) return aPos ? -1 : 1;
  return b.roi - a.roi;
}

function sortCombined(
  rows: PrismaAnalyst[],
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

export const getAnalystLeaderboard = baseProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      sortBy: z.enum(["roi", "winRate", "followers", "earned"]).default("earned"),
      currentUserWallet: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    const { limit, sortBy, currentUserWallet } = input;

    const dbAnalysts = await db.analyst.findMany({
      where: {
        totalPredictions: { gte: 5 },
      },
    });

    const dbWallets = new Set(dbAnalysts.map((a) => a.wallet.toLowerCase()));
    const mockExtras = mockAnalysts
      .filter((m) => !dbWallets.has(m.wallet.toLowerCase()))
      .map(prismaLikeFromMock);

    const combined = [...dbAnalysts, ...mockExtras];
    sortCombined(combined, sortBy);

    const analysts = combined.slice(0, limit);

    const copySeedWallets = new Set(
      mockAnalysts.map((m) => m.wallet.toLowerCase()),
    );

    const rankedLeaderboard = await Promise.all(
      analysts.map(async (analyst, index) => {
        const latest = await db.order.findFirst({
          where: { wallet: analyst.wallet.toLowerCase() },
          orderBy: { createdAt: "desc" },
          include: { market: { select: { event: true } } },
        });

        const seedLabel = getCopySeedLatestTradeLabel(analyst.wallet);
        const dbLabel = latest
          ? `${latest.market.event} · ${latest.outcome}`
          : null;
        const latestTradeLabel = copySeedWallets.has(
          analyst.wallet.toLowerCase(),
        )
          ? seedLabel ?? dbLabel
          : dbLabel ?? seedLabel;

        return {
          ...analyst,
          rank: index + 1,
          isCurrentUser: currentUserWallet
            ? analyst.wallet.toLowerCase() === currentUserWallet.toLowerCase()
            : false,
          latestTradeLabel,
        };
      }),
    );

    return {
      leaderboard: rankedLeaderboard,
      updatedAt: new Date(),
    };
  });
