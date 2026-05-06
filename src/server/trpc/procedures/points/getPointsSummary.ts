import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  DIAMOND: 20000,
} as const;

export const getPointsSummary = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    })
  )
  .query(async ({ input }) => {
    const normalizedAddress = input.walletAddress.toLowerCase();

    // Get total points
    const pointsTotal = await db.pointsTotal.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (!pointsTotal) {
      return {
        totalPoints: 0,
        tier: "BRONZE",
        nextTier: "SILVER",
        pointsToNextTier: 1000,
        globalRank: null,
        recentActivity: [],
      };
    }

    // Calculate next tier and points needed
    let nextTier: string | null = null;
    let pointsToNextTier = 0;

    if (pointsTotal.tier === "BRONZE") {
      nextTier = "SILVER";
      pointsToNextTier = TIER_THRESHOLDS.SILVER - pointsTotal.totalPoints;
    } else if (pointsTotal.tier === "SILVER") {
      nextTier = "GOLD";
      pointsToNextTier = TIER_THRESHOLDS.GOLD - pointsTotal.totalPoints;
    } else if (pointsTotal.tier === "GOLD") {
      nextTier = "DIAMOND";
      pointsToNextTier = TIER_THRESHOLDS.DIAMOND - pointsTotal.totalPoints;
    }

    // Calculate global rank
    const higherRankedCount = await db.pointsTotal.count({
      where: {
        totalPoints: {
          gt: pointsTotal.totalPoints,
        },
      },
    });
    const globalRank = higherRankedCount + 1;

    // Get recent activity (last 10)
    const recentActivity = await db.pointsLedger.findMany({
      where: { walletAddress: normalizedAddress },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      totalPoints: pointsTotal.totalPoints,
      tier: pointsTotal.tier,
      nextTier,
      pointsToNextTier,
      globalRank,
      recentActivity: recentActivity.map((entry) => ({
        actionType: entry.actionType,
        points: entry.points,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      })),
    };
  });
