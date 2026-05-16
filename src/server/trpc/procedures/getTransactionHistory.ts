import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  LEDGER_HISTORY_FILTERS,
  LEDGER_TRANSACTION_TYPE_SET,
  ledgerHistoryTypeWhere,
  type LedgerHistoryFilter,
} from "~/lib/ledger/ledgerTransactionTypes";

const historyType = z.enum(
  LEDGER_HISTORY_FILTERS as unknown as [LedgerHistoryFilter, ...LedgerHistoryFilter[]],
);

export const getTransactionHistory = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      type: historyType.default("all"),
      /** Client cache scope only — ignored for Prisma reads. */
      clientChainId: z.number().int().default(0),
      /** Dev: log non-canonical rows once per request (server console). */
      debugLedger: z.boolean().optional(),
    }),
  )
  .query(async ({ input }) => {
    const { walletAddress, limit, offset, type, debugLedger } = input;
    const wallet = walletAddress.toLowerCase();

    const where: Record<string, unknown> = {
      wallet,
      ...ledgerHistoryTypeWhere(type),
    };

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
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    if (debugLedger && process.env.NODE_ENV !== "production") {
      for (const row of transactions) {
        if (!LEDGER_TRANSACTION_TYPE_SET.has(row.type)) {
          console.warn("[ledger] unknown Transaction.type", row.type, row.id);
        }
      }
    }

    const totalCount = await db.transaction.count({ where });

    return {
      transactions,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  });
