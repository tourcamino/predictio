import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getAnalystPredictionAnalytics = baseProcedure
  .input(z.object({ 
    analystId: z.string(),
    timeRange: z.enum(['7d', '30d', '90d', 'all']).default('all'),
  }))
  .query(async ({ input }) => {
    // Get analyst from database
    const analyst = await db.analyst.findUnique({
      where: { id: input.analystId },
    });
    
    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst not found",
      });
    }

    // Calculate time range filter
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (input.timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = undefined;
    }

    // Get all resolved orders for this analyst with market data
    const orders = await db.order.findMany({
      where: {
        wallet: analyst.wallet,
        status: 'resolved',
        ...(startDate ? { resolvedAt: { gte: startDate } } : {}),
      },
      include: {
        market: {
          select: {
            sport: true,
            league: true,
            event: true,
          },
        },
      },
      orderBy: {
        resolvedAt: 'asc',
      },
    });

    // Aggregate by sport
    const sportBreakdown = new Map<string, {
      sport: string;
      predictions: number;
      wins: number;
      losses: number;
      totalInvested: number;
      totalPnL: number;
      winRate: number;
      roi: number;
    }>();

    // Aggregate by league
    const leagueBreakdown = new Map<string, {
      league: string;
      sport: string;
      predictions: number;
      wins: number;
      losses: number;
      totalInvested: number;
      totalPnL: number;
      winRate: number;
      roi: number;
    }>();

    // Track accuracy over time (weekly buckets)
    const weeklyAccuracy: Array<{
      weekStart: Date;
      predictions: number;
      wins: number;
      winRate: number;
    }> = [];

    const weeklyMap = new Map<string, { predictions: number; wins: number }>();

    orders.forEach((order) => {
      const sport = order.market.sport;
      const league = order.market.league;
      const costBasis = (order.shares || 0) * (order.avgPrice || 0);
      const pnl = order.pnl || 0;
      const isWin = pnl > 0;

      // Aggregate by sport
      if (!sportBreakdown.has(sport)) {
        sportBreakdown.set(sport, {
          sport,
          predictions: 0,
          wins: 0,
          losses: 0,
          totalInvested: 0,
          totalPnL: 0,
          winRate: 0,
          roi: 0,
        });
      }
      const sportData = sportBreakdown.get(sport)!;
      sportData.predictions++;
      if (isWin) sportData.wins++;
      else sportData.losses++;
      sportData.totalInvested += costBasis;
      sportData.totalPnL += pnl;

      // Aggregate by league
      const leagueKey = `${sport}:${league}`;
      if (!leagueBreakdown.has(leagueKey)) {
        leagueBreakdown.set(leagueKey, {
          league,
          sport,
          predictions: 0,
          wins: 0,
          losses: 0,
          totalInvested: 0,
          totalPnL: 0,
          winRate: 0,
          roi: 0,
        });
      }
      const leagueData = leagueBreakdown.get(leagueKey)!;
      leagueData.predictions++;
      if (isWin) leagueData.wins++;
      else leagueData.losses++;
      leagueData.totalInvested += costBasis;
      leagueData.totalPnL += pnl;

      // Track weekly accuracy
      if (order.resolvedAt) {
        const weekStart = new Date(order.resolvedAt);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        const weekKey = weekStart.toISOString();

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, { predictions: 0, wins: 0 });
        }
        const weekData = weeklyMap.get(weekKey)!;
        weekData.predictions++;
        if (isWin) weekData.wins++;
      }
    });

    // Calculate final metrics for sports
    const sportStats = Array.from(sportBreakdown.values()).map((data) => {
      data.winRate = data.predictions > 0 ? (data.wins / data.predictions) * 100 : 0;
      data.roi = data.totalInvested > 0 ? (data.totalPnL / data.totalInvested) * 100 : 0;
      return data;
    }).sort((a, b) => b.roi - a.roi);

    // Calculate final metrics for leagues
    const leagueStats = Array.from(leagueBreakdown.values()).map((data) => {
      data.winRate = data.predictions > 0 ? (data.wins / data.predictions) * 100 : 0;
      data.roi = data.totalInvested > 0 ? (data.totalPnL / data.totalInvested) * 100 : 0;
      return data;
    }).sort((a, b) => b.roi - a.roi);

    // Convert weekly map to array and sort
    Array.from(weeklyMap.entries()).forEach(([weekKey, data]) => {
      weeklyAccuracy.push({
        weekStart: new Date(weekKey),
        predictions: data.predictions,
        wins: data.wins,
        winRate: data.predictions > 0 ? (data.wins / data.predictions) * 100 : 0,
      });
    });
    weeklyAccuracy.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

    return {
      sportBreakdown: sportStats,
      leagueBreakdown: leagueStats,
      accuracyOverTime: weeklyAccuracy,
      totalPredictions: orders.length,
    };
  });
