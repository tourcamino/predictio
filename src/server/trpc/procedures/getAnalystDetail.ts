import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  mockAnalysts,
  getCopySeedPredictionHistoryRows,
} from "~/data/mockAffiliates";
import { parseYesNoPrices } from "~/server/utils/prismaMarket";
import { toFiniteNumber } from "~/utils/formatCopyTrading";

export const getAnalystDetail = baseProcedure
  .input(z.object({ analystId: z.string() }))
  .query(async ({ input }) => {
    let analyst = await db.analyst.findUnique({
      where: { id: input.analystId },
    });

    if (!analyst) {
      const mockAnalyst = mockAnalysts.find((a) => a.id === input.analystId);

      if (!mockAnalyst) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analyst not found",
        });
      }

      analyst = mockAnalyst as any;
    }

    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst not found",
      });
    }

    const rawSport = analyst.sport as unknown;
    const sportList: string[] = Array.isArray(rawSport)
      ? rawSport.map((s) => String(s))
      : typeof rawSport === "string"
        ? [rawSport]
        : ["Football"];
    const sportAllow = new Set(sportList.map((s) => s.toLowerCase()));
    const sport0 = sportList[0] ?? "Football";

    const orderRowsRaw = await db.order.findMany({
      where: { wallet: analyst.wallet.toLowerCase() },
      include: { market: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const orderRows = orderRowsRaw.filter((o) =>
      sportAllow.has(o.market.sport.toLowerCase()),
    );

    const seedHistory = getCopySeedPredictionHistoryRows(
      analyst.wallet,
      sport0,
      sportList,
    );

    const predictionHistory =
      orderRows.length > 0
        ? orderRows.map((order) => {
            const { yesPrice, noPrice } = parseYesNoPrices(order.market.outcomes);
            const unit =
              order.outcome.toUpperCase() === "YES" ? yesPrice : noPrice;
            const decimalOdds = unit > 0 ? 1 / unit : 2;
            const resolved = order.status === "resolved";
            const won = resolved && (order.pnl ?? 0) > 0;
            const fc = analyst.followersCount ?? 0;
            const copiedEstimate = Math.min(
              14,
              Math.max(0, Math.floor(fc * 0.35 + (order.id.length % 3))),
            );
            return {
              id: order.id,
              event: order.market.event,
              sport: order.market.sport,
              odds: Number(decimalOdds.toFixed(2)),
              stake: Math.round(order.amount * 100) / 100,
              outcome: !resolved ? "Open" : won ? "Won" : "Lost",
              profit:
                resolved ? Math.round((order.pnl ?? 0) * 100) / 100 : 0,
              copiedBy: copiedEstimate,
              timestamp:
                order.resolvedAt?.getTime() ?? order.heldSince.getTime(),
            };
          })
        : seedHistory.length > 0
          ? seedHistory
          : [];

    const followerGrowth =
      predictionHistory.length > 0 ? generateMockFollowerGrowth(analyst) : [];
    const performanceData =
      predictionHistory.length > 0 ? generateCoherentPerformanceWeeks(analyst) : [];

    return {
      analyst: {
        ...analyst,
        twitterUrl: analyst.twitterUrl || undefined,
        telegramUrl: analyst.telegramUrl || undefined,
        websiteUrl: analyst.websiteUrl || undefined,
      },
      predictionHistory,
      followerGrowth,
      performanceData,
    };
  });

function generateMockPredictionHistory(analyst: {
  winRate: number;
  sport?: string | string[];
}) {
  const predictions = [];
  const now = Date.now();
  const sportLabel = Array.isArray(analyst.sport)
    ? analyst.sport[0]
    : analyst.sport;

  for (let i = 0; i < 20; i++) {
    const daysAgo = i * 3;
    const isWin = Math.random() < analyst.winRate / 100;

    predictions.push({
      id: `pred-${i}`,
      marketId: `market-${i}`,
      event: `Match ${i + 1}`,
      sport: sportLabel,
      outcome: isWin ? "Won" : "Lost",
      odds: (1.5 + Math.random() * 1.5).toFixed(2),
      stake: Math.floor(Math.random() * 500) + 100,
      profit: isWin
        ? Math.floor(Math.random() * 300) + 50
        : -Math.floor(Math.random() * 200) - 50,
      timestamp: now - daysAgo * 24 * 60 * 60 * 1000,
      copiedBy: Math.floor(Math.random() * 50),
    });
  }

  return predictions;
}

function generateMockFollowerGrowth(analyst: { followersCount: number }) {
  const data = [];
  const days = 30;
  const current = analyst.followersCount;

  for (let i = days; i >= 0; i--) {
    const progress = (days - i) / days;
    const followers = Math.floor(
      current * progress * (0.5 + Math.random() * 0.5),
    );

    data.push({
      date: Date.now() - i * 24 * 60 * 60 * 1000,
      followers,
    });
  }

  return data;
}

function fnv1a32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unitNoise(wallet: string, salt: number): number {
  return (fnv1a32(`${wallet}:${salt}`) % 10000) / 10000;
}

/** 12-week curve anchored to the analyst's stored ROI / win rate (no fake “always positive” ROI). */
function generateCoherentPerformanceWeeks(analyst: {
  wallet: string;
  roi: number;
  winRate: number;
}) {
  const weeks = 12;
  const targetRoi = toFiniteNumber(analyst.roi, 0);
  const targetWin = toFiniteNumber(analyst.winRate, 0);
  const data: Array<{
    week: number;
    roi: number;
    winRate: number;
    predictions: number;
    volume: number;
  }> = [];

  const startRoi =
    targetRoi * (0.45 + unitNoise(analyst.wallet, 1) * 0.35) +
    (unitNoise(analyst.wallet, 2) - 0.5) * 6;

  for (let i = 0; i <= weeks; i++) {
    const t = i / weeks;
    const blended = startRoi * (1 - t) + targetRoi * t;
    const wobble = (unitNoise(analyst.wallet, i + 10) - 0.5) * 14 * (1 - t * 0.65);
    let roi = blended + wobble;
    let winRate =
      targetWin + (unitNoise(analyst.wallet, i + 200) - 0.5) * 14 * (1 - t * 0.5);
    winRate = Math.min(100, Math.max(0, winRate));
    if (i === weeks) {
      roi = targetRoi;
      winRate = targetWin;
    }
    data.push({
      week: i,
      roi,
      winRate,
      predictions: Math.floor(4 + unitNoise(analyst.wallet, i + 400) * 9),
      volume: Math.floor(900 + unitNoise(analyst.wallet, i + 500) * 4200),
    });
  }

  return data;
}
