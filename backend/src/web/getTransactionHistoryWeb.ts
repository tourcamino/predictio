import type { PrismaClient } from "@prisma/client";
import {
  ledgerHistoryTypeWhere,
  type TransactionHistoryFilter,
} from "../lib/ledgerTransactionTypes";

export type { TransactionHistoryFilter };

export async function runGetTransactionHistoryWeb(
  prisma: PrismaClient,
  input: {
    walletAddress: string;
    limit?: number;
    offset?: number;
    type?: TransactionHistoryFilter;
  },
) {
  const wallet = input.walletAddress.trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const offset = Math.max(0, input.offset ?? 0);
  const type = input.type ?? "all";

  const where: Record<string, unknown> = {
    wallet,
    ...ledgerHistoryTypeWhere(type as Parameters<typeof ledgerHistoryTypeWhere>[0]),
  };

  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
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
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    totalCount,
    hasMore: offset + limit < totalCount,
    runtime: "express-vps" as const,
  };
}
