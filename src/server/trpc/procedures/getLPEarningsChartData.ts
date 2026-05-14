import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getLPEarningsChartData = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      timeRange: z.enum(['7D', '30D', '90D', 'ALL']).default('30D'),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, timeRange } = input;

    // Calculate date filter based on time range
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (timeRange) {
      case '7D':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30D':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90D':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'ALL':
        startDate = undefined;
        break;
    }

    // Get all LP positions for the user
    const positions = await db.liquidityPosition.findMany({
      where: {
        userWallet: walletAddress.toLowerCase(),
      },
      include: {
        feeEarnings: {
          where: startDate ? {
            createdAt: {
              gte: startDate,
            },
          } : undefined,
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Get LP-related transactions (deposits and withdrawals)
    const transactions = await db.transaction.findMany({
      where: {
        wallet: walletAddress.toLowerCase(),
        type: {
          in: ['lp_deposit', 'lp_withdraw'],
        },
        ...(startDate && {
          createdAt: {
            gte: startDate,
          },
        }),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Build a timeline of all events
    interface TimelineEvent {
      timestamp: Date;
      type: 'deposit' | 'withdrawal' | 'fee';
      amount: number;
    }

    const events: TimelineEvent[] = [];

    // Add deposits and withdrawals
    transactions.forEach(tx => {
      events.push({
        timestamp: tx.createdAt,
        type: tx.type === 'lp_deposit' ? 'deposit' : 'withdrawal',
        amount: tx.amount,
      });
    });

    // Add fee earnings
    positions.forEach(position => {
      position.feeEarnings.forEach(fee => {
        events.push({
          timestamp: fee.createdAt,
          type: 'fee',
          amount: fee.amount,
        });
      });
    });

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Aggregate into daily snapshots
    const dailySnapshots = new Map<string, {
      date: Date;
      deposits: number;
      withdrawals: number;
      fees: number;
      cumulativeDeposits: number;
      cumulativeWithdrawals: number;
      cumulativeFees: number;
      netValue: number;
    }>();

    let cumulativeDeposits = 0;
    let cumulativeWithdrawals = 0;
    let cumulativeFees = 0;

    events.forEach(event => {
      const dateKey = event.timestamp.toISOString().slice(0, 10);
      
      if (!dailySnapshots.has(dateKey)) {
        dailySnapshots.set(dateKey, {
          date: new Date(dateKey),
          deposits: 0,
          withdrawals: 0,
          fees: 0,
          cumulativeDeposits,
          cumulativeWithdrawals,
          cumulativeFees,
          netValue: cumulativeDeposits - cumulativeWithdrawals + cumulativeFees,
        });
      }

      const snapshot = dailySnapshots.get(dateKey)!;

      if (event.type === 'deposit') {
        snapshot.deposits += event.amount;
        cumulativeDeposits += event.amount;
      } else if (event.type === 'withdrawal') {
        snapshot.withdrawals += event.amount;
        cumulativeWithdrawals += event.amount;
      } else if (event.type === 'fee') {
        snapshot.fees += event.amount;
        cumulativeFees += event.amount;
      }

      // Update cumulative values
      snapshot.cumulativeDeposits = cumulativeDeposits;
      snapshot.cumulativeWithdrawals = cumulativeWithdrawals;
      snapshot.cumulativeFees = cumulativeFees;
      snapshot.netValue = cumulativeDeposits - cumulativeWithdrawals + cumulativeFees;
    });

    // Convert to array and sort by date
    const chartData = Array.from(dailySnapshots.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Calculate summary statistics
    const totalDeposits = cumulativeDeposits;
    const totalWithdrawals = cumulativeWithdrawals;
    const totalFees = cumulativeFees;
    const netValue = totalDeposits - totalWithdrawals + totalFees;
    const roi = totalDeposits > 0 ? ((netValue - (totalDeposits - totalWithdrawals)) / totalDeposits) * 100 : 0;

    // Calculate current active position value
    const activePositions = await db.liquidityPosition.findMany({
      where: {
        userWallet: walletAddress.toLowerCase(),
        status: 'active',
      },
    });

    const currentValue = activePositions.reduce((sum, pos) => sum + pos.currentValue, 0);

    return {
      chartData,
      summary: {
        totalDeposits,
        totalWithdrawals,
        totalFees,
        netValue,
        currentValue,
        roi,
        avgDailyFees: chartData.length > 0 ? totalFees / chartData.length : 0,
      },
    };
  });
