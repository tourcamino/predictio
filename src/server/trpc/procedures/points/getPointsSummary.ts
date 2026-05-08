import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  TIER_THRESHOLDS,
  calculateTier,
  POINTS_EARN_GUIDE,
} from "~/server/utils/pointsLedger";

export const getPointsSummary = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const normalizedAddress = input.walletAddress.toLowerCase();

    let pointsTotal = await db.pointsTotal.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    // Repair: ledger rows exist but totals row missing (e.g. legacy writes)
    if (!pointsTotal) {
      const ledgerSum = await db.pointsLedger.aggregate({
        where: { walletAddress: normalizedAddress },
        _sum: { points: true },
      });
      const sum = ledgerSum._sum.points ?? 0;
      if (sum > 0) {
        const tier = calculateTier(sum);
        pointsTotal = await db.pointsTotal.create({
          data: {
            walletAddress: normalizedAddress,
            totalPoints: sum,
            season: 1,
            tier,
          },
        });
      }
    }

    const actionCounts = await db.pointsLedger.groupBy({
      by: ["actionType"],
      where: { walletAddress: normalizedAddress },
      _count: { _all: true },
    });
    const timesByAction = new Map(
      actionCounts.map((r) => [r.actionType, r._count._all]),
    );

    const earnGuide = POINTS_EARN_GUIDE.map((entry) => {
      const timesEarned = timesByAction.get(entry.actionType) ?? 0;
      const completed = entry.repeatable
        ? timesEarned > 0
        : timesEarned > 0;
      return {
        ...entry,
        timesEarned,
        completed,
      };
    });

    if (!pointsTotal) {
      return {
        totalPoints: 0,
        tier: "BRONZE",
        nextTier: "SILVER",
        pointsToNextTier: TIER_THRESHOLDS.SILVER,
        globalRank: null,
        recentActivity: [],
        earnGuide,
      };
    }

    let nextTier: string | null = null;
    let pointsToNextTier = 0;

    if (pointsTotal.tier === "BRONZE") {
      nextTier = "SILVER";
      pointsToNextTier = Math.max(0, TIER_THRESHOLDS.SILVER - pointsTotal.totalPoints);
    } else if (pointsTotal.tier === "SILVER") {
      nextTier = "GOLD";
      pointsToNextTier = Math.max(0, TIER_THRESHOLDS.GOLD - pointsTotal.totalPoints);
    } else if (pointsTotal.tier === "GOLD") {
      nextTier = "DIAMOND";
      pointsToNextTier = Math.max(0, TIER_THRESHOLDS.DIAMOND - pointsTotal.totalPoints);
    }

    const higherRankedCount = await db.pointsTotal.count({
      where: {
        totalPoints: {
          gt: pointsTotal.totalPoints,
        },
      },
    });
    const globalRank = higherRankedCount + 1;

    const recentActivity = await db.pointsLedger.findMany({
      where: { walletAddress: normalizedAddress },
      orderBy: { createdAt: "desc" },
      take: 25,
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
      earnGuide,
    };
  });
