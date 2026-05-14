import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getLPEarningsHistory = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      timeRange: z.enum(['7D', '30D', '90D', 'ALL']).default('30D'),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, timeRange, limit, offset } = input;

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
            createdAt: 'desc',
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
        createdAt: 'desc',
      },
    });

    // Build a unified timeline of events
    interface TimelineEvent {
      id: string;
      type: 'deposit' | 'withdrawal' | 'fee_earned';
      timestamp: Date;
      amount: number;
      marketId: string | null;
      marketName: string | null;
      sport: string | null;
      metadata?: any;
    }

    const events: TimelineEvent[] = [];

    // Add deposits and withdrawals
    transactions.forEach(tx => {
      const metadata = tx.metadata as any;
      const isProtocolVault = metadata?.vaultDeposit || metadata?.vaultWithdrawal;
      
      events.push({
        id: tx.id,
        type: tx.type === 'lp_deposit' ? 'deposit' : 'withdrawal',
        timestamp: tx.createdAt,
        amount: tx.amount,
        marketId: isProtocolVault ? 'protocol-vault' : tx.marketId,
        marketName: isProtocolVault ? 'Protocol Vault' : tx.market?.event || null,
        sport: tx.market?.sport || null,
        metadata: metadata,
      });
    });

    // Add fee earnings
    positions.forEach(position => {
      position.feeEarnings.forEach(fee => {
        events.push({
          id: fee.id,
          type: 'fee_earned',
          timestamp: fee.createdAt,
          amount: fee.amount,
          marketId: position.marketId,
          marketName: position.marketId === 'protocol-vault' ? 'Protocol Vault' : null,
          sport: null,
          metadata: {
            positionId: position.id,
            marketVolume: fee.marketVolume,
          },
        });
      });
    });

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate
    const paginatedEvents = events.slice(offset, offset + limit);

    // Get market details for events that need them
    const marketIds = new Set(
      paginatedEvents
        .filter(e => e.marketId && e.marketId !== 'protocol-vault' && !e.marketName)
        .map(e => e.marketId!)
    );

    const markets = await db.market.findMany({
      where: {
        id: {
          in: Array.from(marketIds),
        },
      },
      select: {
        id: true,
        event: true,
        sport: true,
        league: true,
      },
    });

    const marketsMap = new Map(markets.map(m => [m.id, m]));

    // Enrich events with market data
    const enrichedEvents = paginatedEvents.map(event => {
      if (event.marketId && !event.marketName && event.marketId !== 'protocol-vault') {
        const market = marketsMap.get(event.marketId);
        if (market) {
          return {
            ...event,
            marketName: market.event,
            sport: market.sport,
            league: market.league,
          };
        }
      }
      return event;
    });

    // Calculate summary stats
    const totalDeposited = transactions
      .filter(tx => tx.type === 'lp_deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalWithdrawn = transactions
      .filter(tx => tx.type === 'lp_withdraw')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalFeesEarned = positions.reduce(
      (sum, pos) => sum + pos.feesEarned, 
      0
    );

    const totalFeesPending = positions.reduce(
      (sum, pos) => sum + pos.feesPending, 
      0
    );

    const currentValue = positions
      .filter(pos => pos.status === 'active')
      .reduce((sum, pos) => sum + pos.currentValue, 0);

    return {
      events: enrichedEvents,
      totalCount: events.length,
      hasMore: offset + limit < events.length,
      summary: {
        totalDeposited,
        totalWithdrawn,
        totalFeesEarned,
        totalFeesPending,
        currentValue,
        netDeposits: totalDeposited - totalWithdrawn,
        roi: totalDeposited > 0 
          ? ((currentValue + totalWithdrawn - totalDeposited) / totalDeposited) * 100 
          : 0,
      },
    };
  });
