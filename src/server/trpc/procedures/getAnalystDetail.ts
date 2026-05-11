import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { mockAnalysts } from "~/data/mockAffiliates";
import { parseYesNoPrices } from "~/server/utils/prismaMarket";

export const getAnalystDetail = baseProcedure
  .input(z.object({ analystId: z.string() }))
  .query(async ({ input }) => {
    // Try to get analyst from database first
    let analyst = await db.analyst.findUnique({
      where: { id: input.analystId },
    });
    
    // If not in database, fall back to mock data
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

    const orderRows = await db.order.findMany({
      where: { wallet: analyst.wallet.toLowerCase() },
      include: { market: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

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
                order.resolvedAt?.getTime() ??
                order.heldSince.getTime(),
            };
          })
        : generateMockPredictionHistory(analyst);
    
    // Generate mock follower growth data
    const followerGrowth = generateMockFollowerGrowth(analyst);
    
    // Generate mock performance chart data
    const performanceData = generateMockPerformanceData(analyst);

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

// Helper functions to generate mock data
function generateMockPredictionHistory(analyst: any) {
  const predictions = [];
  const now = Date.now();
  
  for (let i = 0; i < 20; i++) {
    const daysAgo = i * 3;
    const isWin = Math.random() < analyst.winRate / 100;
    
    predictions.push({
      id: `pred-${i}`,
      marketId: `market-${i}`,
      event: `Match ${i + 1}`,
      sport: Array.isArray(analyst.sport) ? analyst.sport[0] : analyst.sport,
      outcome: isWin ? "Won" : "Lost",
      odds: (1.5 + Math.random() * 1.5).toFixed(2),
      stake: Math.floor(Math.random() * 500) + 100,
      profit: isWin ? Math.floor(Math.random() * 300) + 50 : -Math.floor(Math.random() * 200) - 50,
      timestamp: now - daysAgo * 24 * 60 * 60 * 1000,
      copiedBy: Math.floor(Math.random() * 50),
    });
  }
  
  return predictions;
}

function generateMockFollowerGrowth(analyst: any) {
  const data = [];
  const days = 30;
  const current = analyst.followersCount;
  
  for (let i = days; i >= 0; i--) {
    const progress = (days - i) / days;
    const followers = Math.floor(current * progress * (0.5 + Math.random() * 0.5));
    
    data.push({
      date: Date.now() - i * 24 * 60 * 60 * 1000,
      followers,
    });
  }
  
  return data;
}

function generateMockPerformanceData(analyst: any) {
  const data = [];
  const weeks = 12;
  
  for (let i = weeks; i >= 0; i--) {
    const weekRoi = analyst.roi + (Math.random() - 0.5) * 10;
    const weekWinRate = analyst.winRate + (Math.random() - 0.5) * 15;
    
    data.push({
      week: weeks - i,
      roi: Math.max(0, weekRoi),
      winRate: Math.max(0, Math.min(100, weekWinRate)),
      predictions: Math.floor(Math.random() * 10) + 5,
      volume: Math.floor(Math.random() * 5000) + 1000,
    });
  }
  
  return data;
}
