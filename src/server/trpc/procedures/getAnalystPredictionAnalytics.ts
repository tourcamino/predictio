import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  mockAnalysts,
  getCopySeedPredictionHistoryRows,
} from "~/data/mockAffiliates";

type SportRow = {
  sport: string;
  predictions: number;
  wins: number;
  losses: number;
  totalInvested: number;
  totalPnL: number;
  winRate: number;
  roi: number;
};

type LeagueRow = {
  league: string;
  sport: string;
  predictions: number;
  wins: number;
  losses: number;
  totalInvested: number;
  totalPnL: number;
  winRate: number;
  roi: number;
};

function finalizeSportRows(rows: Map<string, SportRow>): SportRow[] {
  return Array.from(rows.values())
    .map((data) => {
      data.winRate =
        data.predictions > 0 ? (data.wins / data.predictions) * 100 : 0;
      data.roi =
        data.totalInvested > 0 ? (data.totalPnL / data.totalInvested) * 100 : 0;
      return data;
    })
    .sort((a, b) => b.roi - a.roi);
}

function finalizeLeagueRows(rows: Map<string, LeagueRow>): LeagueRow[] {
  return Array.from(rows.values())
    .map((data) => {
      data.winRate =
        data.predictions > 0 ? (data.wins / data.predictions) * 100 : 0;
      data.roi =
        data.totalInvested > 0 ? (data.totalPnL / data.totalInvested) * 100 : 0;
      return data;
    })
    .sort((a, b) => b.roi - a.roi);
}

function analyticsFromSeedHistory(
  rows: ReturnType<typeof getCopySeedPredictionHistoryRows>,
): {
  sportBreakdown: SportRow[];
  leagueBreakdown: LeagueRow[];
  accuracyOverTime: Array<{
    weekStart: Date;
    predictions: number;
    wins: number;
    winRate: number;
  }>;
  totalPredictions: number;
} {
  const sportBreakdown = new Map<string, SportRow>();
  const leagueBreakdown = new Map<string, LeagueRow>();
  const weeklyMap = new Map<string, { predictions: number; wins: number }>();

  for (const row of rows) {
    if (row.outcome === "Open") continue;
    const sport = row.sport;
    const cost = row.stake;
    const pnl = row.profit;
    const isWin = pnl > 0;

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
    const sd = sportBreakdown.get(sport)!;
    sd.predictions++;
    if (isWin) sd.wins++;
    else sd.losses++;
    sd.totalInvested += cost;
    sd.totalPnL += pnl;

    const leagueKey = `${sport}:Recent`;
    if (!leagueBreakdown.has(leagueKey)) {
      leagueBreakdown.set(leagueKey, {
        league: "Recent",
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
    const ld = leagueBreakdown.get(leagueKey)!;
    ld.predictions++;
    if (isWin) ld.wins++;
    else ld.losses++;
    ld.totalInvested += cost;
    ld.totalPnL += pnl;

    const d = new Date(row.timestamp);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    const weekKey = d.toISOString();
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, { predictions: 0, wins: 0 });
    }
    const wk = weeklyMap.get(weekKey)!;
    wk.predictions++;
    if (isWin) wk.wins++;
  }

  const weeklyAccuracy: Array<{
    weekStart: Date;
    predictions: number;
    wins: number;
    winRate: number;
  }> = [];
  Array.from(weeklyMap.entries()).forEach(([weekKey, data]) => {
    weeklyAccuracy.push({
      weekStart: new Date(weekKey),
      predictions: data.predictions,
      wins: data.wins,
      winRate:
        data.predictions > 0 ? (data.wins / data.predictions) * 100 : 0,
    });
  });
  weeklyAccuracy.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

  return {
    sportBreakdown: finalizeSportRows(sportBreakdown),
    leagueBreakdown: finalizeLeagueRows(leagueBreakdown),
    accuracyOverTime: weeklyAccuracy,
    totalPredictions: rows.filter((r) => r.outcome !== "Open").length,
  };
}

export const getAnalystPredictionAnalytics = baseProcedure
  .input(
    z.object({
      analystId: z.string(),
      timeRange: z.enum(["7d", "30d", "90d", "all"]).default("all"),
    }),
  )
  .query(async ({ input }) => {
    let analyst = await db.analyst.findUnique({
      where: { id: input.analystId },
    });

    if (!analyst) {
      const mock = mockAnalysts.find((m) => m.id === input.analystId);
      if (mock) {
        analyst = await db.analyst.findUnique({
          where: { wallet: mock.wallet.toLowerCase() },
        });
      }
    }

    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst not found",
      });
    }

    const sportList: string[] = Array.isArray(analyst.sport)
      ? analyst.sport.map((s) => String(s))
      : [String(analyst.sport || "Football")];
    const sportAllow = new Set(sportList.map((s) => s.toLowerCase()));
    const sport0 = sportList[0] ?? "Football";

    const now = new Date();
    let startDate: Date | undefined;

    switch (input.timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = undefined;
    }

    const orders = await db.order.findMany({
      where: {
        wallet: analyst.wallet.toLowerCase(),
        status: "resolved",
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
        resolvedAt: "asc",
      },
    });

    const filteredOrders = orders.filter((o) =>
      sportAllow.has(o.market.sport.toLowerCase()),
    );

    if (filteredOrders.length === 0) {
      const seedRows = getCopySeedPredictionHistoryRows(
        analyst.wallet,
        sport0,
        sportList,
      );
      if (seedRows.length > 0) {
        return analyticsFromSeedHistory(seedRows);
      }
      return {
        sportBreakdown: [],
        leagueBreakdown: [],
        accuracyOverTime: [],
        totalPredictions: 0,
      };
    }

    const sportBreakdown = new Map<string, SportRow>();
    const leagueBreakdown = new Map<string, LeagueRow>();
    const weeklyMap = new Map<string, { predictions: number; wins: number }>();

    filteredOrders.forEach((order) => {
      const sport = order.market.sport;
      const league = order.market.league ?? "—";
      const costBasis = (order.shares || 0) * (order.avgPrice || 0);
      const pnl = order.pnl || 0;
      const isWin = pnl > 0;

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

      if (order.resolvedAt) {
        const weekStart = new Date(order.resolvedAt);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString();

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, { predictions: 0, wins: 0 });
        }
        const weekData = weeklyMap.get(weekKey)!;
        weekData.predictions++;
        if (isWin) weekData.wins++;
      }
    });

    const weeklyAccuracy: Array<{
      weekStart: Date;
      predictions: number;
      wins: number;
      winRate: number;
    }> = [];

    Array.from(weeklyMap.entries()).forEach(([weekKey, data]) => {
      weeklyAccuracy.push({
        weekStart: new Date(weekKey),
        predictions: data.predictions,
        wins: data.wins,
        winRate:
          data.predictions > 0 ? (data.wins / data.predictions) * 100 : 0,
      });
    });
    weeklyAccuracy.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

    return {
      sportBreakdown: finalizeSportRows(sportBreakdown),
      leagueBreakdown: finalizeLeagueRows(leagueBreakdown),
      accuracyOverTime: weeklyAccuracy,
      totalPredictions: filteredOrders.length,
    };
  });
