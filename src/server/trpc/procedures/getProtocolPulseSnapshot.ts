import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { getAzuroGraphqlEndpoint } from "~/services/azuro";

/** Global protocol telemetry — real DB counts only (PR9). */
export const getProtocolPulseSnapshot = baseProcedure.query(async () => {
  const checkedAt = new Date().toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    openOrders,
    openMarketsGroup,
    recentFills,
    recentSettlements,
    lastSettlementTx,
    lastResolvedOrder,
    cronHeartbeat,
    curatedOpen,
    payouts24h,
  ] = await Promise.all([
    db.order.count({ where: { status: "open" } }),
    db.order.groupBy({
      by: ["marketId"],
      where: { status: "open" },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        marketId: true,
        wallet: true,
        outcome: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    }),
    db.transaction.findMany({
      where: {
        type: { in: ["position_settlement_win", "position_settlement_loss"] },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        amount: true,
        marketId: true,
        wallet: true,
        createdAt: true,
      },
    }),
    db.transaction.findFirst({
      where: {
        type: { in: ["position_settlement_win", "position_settlement_loss"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.order.findFirst({
      where: { status: "resolved", resolvedAt: { not: null } },
      orderBy: { resolvedAt: "desc" },
      select: { id: true, marketId: true, resolvedAt: true, pnl: true, wallet: true },
    }),
    db.botHeartbeat.findUnique({ where: { id: "settlement-cron" } }),
    db.curatedEvent.count({ where: { isActive: true } }),
    db.transaction.count({
      where: {
        type: { in: ["position_settlement_win", "position_settlement_loss"] },
        createdAt: { gte: since24h },
      },
    }),
  ]);

  const uniqueWallets24h = await db.order.findMany({
    where: { createdAt: { gte: since24h } },
    select: { wallet: true },
    distinct: ["wallet"],
  });

  return {
    checkedAt,
    azuroEndpoint: getAzuroGraphqlEndpoint(),
    settlementCronCadence: "~5 minutes (VPS)",
    queue: {
      openOrders,
      openMarkets: openMarketsGroup.length,
    },
    catalog: {
      curatedOpenFootball: curatedOpen,
    },
    activity24h: {
      payouts: payouts24h,
      activeWallets: uniqueWallets24h.length,
      recentFills: recentFills.length,
    },
    lastSettlementTickAt: cronHeartbeat?.lastRun?.toISOString() ?? null,
    lastPayoutAt: lastSettlementTx?.createdAt?.toISOString() ?? null,
    lastResolvedOrder: lastResolvedOrder
      ? {
          orderId: lastResolvedOrder.id,
          marketId: lastResolvedOrder.marketId,
          wallet: lastResolvedOrder.wallet,
          resolvedAt: lastResolvedOrder.resolvedAt?.toISOString() ?? null,
          pnl: lastResolvedOrder.pnl,
        }
      : null,
    payoutProofStatus:
      payouts24h > 0 || lastSettlementTx
        ? ("historical_exists" as const)
        : ("no_production_payout_yet" as const),
    recentFills: recentFills.map((o) => ({
      orderId: o.id,
      marketId: o.marketId,
      wallet: `${o.wallet.slice(0, 6)}…${o.wallet.slice(-4)}`,
      outcome: o.outcome,
      amount: o.amount,
      status: o.status,
      at: o.createdAt.toISOString(),
    })),
    recentSettlements: recentSettlements.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      marketId: t.marketId,
      at: t.createdAt.toISOString(),
    })),
  };
});
