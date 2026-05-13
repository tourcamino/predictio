import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getTraderPerformanceHistory = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      timeRange: z.enum(['7d', '30d', '90d', '1y', 'all']).default('90d'),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, timeRange } = input;
    
    // Calculate time range filter
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = undefined;
    }
    
    // Fetch all orders for this trader
    const allOrders = await db.order.findMany({
      where: {
        wallet: walletAddress.toLowerCase(),
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      include: {
        market: {
          select: {
            id: true,
            event: true,
            sport: true,
            league: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    if (allOrders.length === 0) {
      return {
        pnlHistory: [],
        winRateHistory: [],
        roiHistory: [],
        volumeHistory: [],
        profitDistribution: {
          wins: 0,
          losses: 0,
          avgWin: 0,
          avgLoss: 0,
          largestWin: 0,
          largestLoss: 0,
        },
        summary: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalVolume: 0,
          totalPnL: 0,
          avgRoi: 0,
          avgWinRate: 0,
        },
      };
    }
    
    // Build time-series data
    const dailyData = new Map<string, {
      date: Date;
      trades: number;
      wins: number;
      volume: number;
      pnl: number;
      cumulativePnl: number;
    }>();
    
    let cumulativePnl = 0;
    let totalVolume = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    let largestWin = 0;
    let largestLoss = 0;
    
    // Process all resolved orders
    const resolvedOrders = allOrders.filter(o => o.status === 'resolved' && o.resolvedAt);
    
    resolvedOrders.forEach(order => {
      const dateKey = order.resolvedAt!.toISOString().slice(0, 10);
      const costBasis = (order.shares || 0) * (order.avgPrice || 0);
      const pnl = order.pnl || 0;
      const isWin = pnl > 0;
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: new Date(dateKey),
          trades: 0,
          wins: 0,
          volume: 0,
          pnl: 0,
          cumulativePnl: 0,
        });
      }
      
      const dayData = dailyData.get(dateKey)!;
      dayData.trades++;
      if (isWin) dayData.wins++;
      dayData.volume += costBasis;
      dayData.pnl += pnl;
      
      cumulativePnl += pnl;
      totalVolume += costBasis;
      
      if (isWin) {
        winningTrades++;
        totalWinAmount += pnl;
        largestWin = Math.max(largestWin, pnl);
      } else {
        losingTrades++;
        totalLossAmount += Math.abs(pnl);
        largestLoss = Math.min(largestLoss, pnl);
      }
      
      dayData.cumulativePnl = cumulativePnl;
    });
    
    // Convert daily data to arrays and fill gaps
    const sortedDates = Array.from(dailyData.keys()).sort();
    const pnlHistory: Array<{ date: Date; pnl: number; cumulativePnl: number }> = [];
    const winRateHistory: Array<{ date: Date; winRate: number; trades: number }> = [];
    const roiHistory: Array<{ date: Date; roi: number }> = [];
    const volumeHistory: Array<{ date: Date; volume: number }> = [];
    
    let runningCumulativePnl = 0;
    let runningTotalInvested = 0;
    
    sortedDates.forEach(dateKey => {
      const data = dailyData.get(dateKey)!;
      runningCumulativePnl = data.cumulativePnl;
      runningTotalInvested += data.volume;
      
      pnlHistory.push({
        date: data.date,
        pnl: data.pnl,
        cumulativePnl: data.cumulativePnl,
      });
      
      winRateHistory.push({
        date: data.date,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        trades: data.trades,
      });
      
      roiHistory.push({
        date: data.date,
        roi: runningTotalInvested > 0 ? (runningCumulativePnl / runningTotalInvested) * 100 : 0,
      });
      
      volumeHistory.push({
        date: data.date,
        volume: data.volume,
      });
    });
    
    // Calculate profit distribution
    const avgWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
    
    return {
      pnlHistory,
      winRateHistory,
      roiHistory,
      volumeHistory,
      profitDistribution: {
        wins: winningTrades,
        losses: losingTrades,
        avgWin,
        avgLoss,
        largestWin,
        largestLoss,
      },
      summary: {
        totalTrades: resolvedOrders.length,
        winningTrades,
        losingTrades,
        totalVolume,
        totalPnL: cumulativePnl,
        avgRoi: totalVolume > 0 ? (cumulativePnl / totalVolume) * 100 : 0,
        avgWinRate: resolvedOrders.length > 0 ? (winningTrades / resolvedOrders.length) * 100 : 0,
      },
    };
  });
