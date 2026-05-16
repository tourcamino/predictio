import type { PrismaClient } from "@prisma/client";

const LEDGER_CREDIT_TYPES = [
  "position_settlement_win",
  "position_refund",
  "lp_reward_claim",
  "holding_reward",
  "analyst_reward",
  "affiliate_reward",
] as const;

export type TransactionHistoryFilter =
  | "all"
  | "credits"
  | (typeof LEDGER_CREDIT_TYPES)[number]
  | string;

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

  const where: Record<string, unknown> = { wallet };
  if (type === "credits") {
    where.type = { in: [...LEDGER_CREDIT_TYPES] };
  } else if (type !== "all") {
    where.type = type;
  }

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
