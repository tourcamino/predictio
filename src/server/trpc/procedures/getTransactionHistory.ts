import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getTransactionHistory = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      type: z.enum(['all', 'deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost', 'bet_refund']).default('all'),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, limit, offset, type } = input;
    const wallet = walletAddress.toLowerCase();

    // Build where clause
    const where: any = {
      wallet,
    };

    if (type !== 'all') {
      where.type = type;
    }

    // Fetch transactions with market data
    const transactions = await db.transaction.findMany({
      where,
      include: {
        market: {
          select: {
            id: true,
            event: true,
            sport: true,
            league: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await db.transaction.count({ where });

    return {
      transactions,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  });
