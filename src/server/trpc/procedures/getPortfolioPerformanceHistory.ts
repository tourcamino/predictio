import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPortfolioPerformanceHistory = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      timeRange: z.enum(['7D', '30D', '90D', '1W', '1M', '3M', '6M', '1Y', 'ALL', 'CUSTOM']).default('1M'),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, timeRange, startDate, endDate } = input;

    // Calculate date range
    const now = new Date();
    let calculatedStartDate: Date;

    if (timeRange === 'CUSTOM' && startDate && endDate) {
      calculatedStartDate = startDate;
    } else {
      const ranges = {
        '7D': 7 * 24 * 60 * 60 * 1000,
        '30D': 30 * 24 * 60 * 60 * 1000,
        '90D': 90 * 24 * 60 * 60 * 1000,
        '1W': 7 * 24 * 60 * 60 * 1000,
        '1M': 30 * 24 * 60 * 60 * 1000,
        '3M': 90 * 24 * 60 * 60 * 1000,
        '6M': 180 * 24 * 60 * 60 * 1000,
        '1Y': 365 * 24 * 60 * 60 * 1000,
        'ALL': Number.MAX_SAFE_INTEGER,
        'CUSTOM': 30 * 24 * 60 * 60 * 1000, // fallback to 30 days
      };
      
      calculatedStartDate = new Date(now.getTime() - ranges[timeRange]);
    }

    // Fetch all orders for the wallet
    const allOrders = await db.order.findMany({
      where: {
        wallet: walletAddress,
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

    // Fetch all transactions for the wallet
    const allTransactions = await db.transaction.findMany({
      where: {
        wallet: walletAddress,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Build time-series data points
    const dataPoints: Array<{
      timestamp: Date;
      portfolioValue: number;
      cumulativePnL: number;
      realizedPnL: number;
      unrealizedPnL: number;
      totalInvested: number;
    }> = [];

    // If no orders, return empty state with a single starting point
    if (allOrders.length === 0) {
      dataPoints.push({
        timestamp: now,
        portfolioValue: 0,
        cumulativePnL: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
        totalInvested: 0,
      });

      return {
        dataPoints,
        positionEvents: [],
        summary: {
          totalReturn: 0,
          totalReturnPct: 0,
          startValue: 0,
          endValue: 0,
          highestValue: 0,
          lowestValue: 0,
          totalPositions: 0,
          positionsInRange: 0,
        },
      };
    }

    // Get all relevant dates (order dates and resolution dates)
    const allDates = new Set<number>();
    allOrders.forEach(order => {
      allDates.add(order.createdAt.getTime());
      if (order.resolvedAt) {
        allDates.add(order.resolvedAt.getTime());
      }
    });

    // Add daily checkpoints
    const dayMs = 24 * 60 * 60 * 1000;
    const firstDate = allOrders[0].createdAt.getTime();
    for (let t = firstDate; t <= now.getTime(); t += dayMs) {
      allDates.add(t);
    }

    // Sort dates and filter by time range
    const sortedDates = Array.from(allDates)
      .sort((a, b) => a - b)
      .filter(t => t >= calculatedStartDate.getTime());

    // If no dates in range, add at least the current time
    if (sortedDates.length === 0) {
      sortedDates.push(now.getTime());
    }

    // Calculate portfolio state at each date
    sortedDates.forEach(timestamp => {
      const date = new Date(timestamp);
      
      // Get orders that existed at this time
      const ordersAtTime = allOrders.filter(o => o.createdAt <= date);
      
      // Separate open and resolved positions at this time
      const openOrders = ordersAtTime.filter(o => 
        o.status === 'open' || (o.resolvedAt && o.resolvedAt > date)
      );
      const resolvedOrders = ordersAtTime.filter(o => 
        o.status === 'resolved' && o.resolvedAt && o.resolvedAt <= date
      );

      // Calculate metrics
      const totalInvested = openOrders.reduce((sum, o) => sum + o.amount, 0);
      const realizedPnL = resolvedOrders.reduce((sum, o) => sum + (o.pnl || 0), 0);
      
      // For unrealized P&L, we'll use a simple approximation
      // In reality, we'd need historical market prices
      const unrealizedPnL = openOrders.reduce((sum, o) => {
        // Assume 10% average unrealized gain for open positions (simplified)
        // In production, you'd query historical market prices
        return sum + (o.amount * 0.1);
      }, 0);

      const portfolioValue = totalInvested + unrealizedPnL;
      const cumulativePnL = realizedPnL + unrealizedPnL;

      dataPoints.push({
        timestamp: date,
        portfolioValue,
        cumulativePnL,
        realizedPnL,
        unrealizedPnL,
        totalInvested,
      });
    });

    type TimelineEvent =
      | {
          id: string;
          type: "opened";
          timestamp: Date;
          marketId: string;
          marketEvent: string;
          sport: string;
          outcome: string;
          amount: number;
          shares: number | null;
        }
      | {
          id: string;
          type: "closed";
          timestamp: Date;
          marketId: string;
          marketEvent: string;
          sport: string;
          outcome: string;
          amount: number;
          pnl: number | null;
        };

    const openedEvents: TimelineEvent[] = allOrders.map((order) => ({
      id: order.id,
      type: "opened" as const,
      timestamp: order.createdAt,
      marketId: order.marketId,
      marketEvent: order.market.event,
      sport: order.market.sport,
      outcome: order.outcome,
      amount: order.amount,
      shares: order.shares,
    }));

    const closedEvents: TimelineEvent[] = allOrders
      .filter((o) => o.resolvedAt)
      .map((order) => ({
        id: order.id,
        type: "closed" as const,
        timestamp: order.resolvedAt!,
        marketId: order.marketId,
        marketEvent: order.market.event,
        sport: order.market.sport,
        outcome: order.outcome,
        amount: order.amount,
        pnl: order.pnl,
      }));

    const positionEvents = [...openedEvents, ...closedEvents].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // Filter events by time range
    const filteredEvents = positionEvents.filter(
      e => e.timestamp >= calculatedStartDate
    );

    // Calculate growth metrics
    const firstPoint = dataPoints[0];
    const lastPoint = dataPoints[dataPoints.length - 1];
    
    const totalReturn = firstPoint && lastPoint
      ? lastPoint.portfolioValue - firstPoint.totalInvested
      : 0;
    
    const totalReturnPct = firstPoint && firstPoint.totalInvested > 0
      ? (totalReturn / firstPoint.totalInvested) * 100
      : 0;

    // Ensure we have valid values for highest and lowest
    const portfolioValues = dataPoints.map(d => d.portfolioValue);
    const highestValue = portfolioValues.length > 0 ? Math.max(...portfolioValues) : 0;
    const lowestValue = portfolioValues.length > 0 ? Math.min(...portfolioValues) : 0;

    return {
      dataPoints,
      positionEvents: filteredEvents,
      summary: {
        totalReturn,
        totalReturnPct,
        startValue: firstPoint?.portfolioValue || 0,
        endValue: lastPoint?.portfolioValue || 0,
        highestValue,
        lowestValue,
        totalPositions: allOrders.length,
        positionsInRange: filteredEvents.filter(e => e.type === 'opened').length,
      },
    };
  });
