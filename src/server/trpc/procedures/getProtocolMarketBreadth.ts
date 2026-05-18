import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { resolveCanonicalLiquidityState } from "~/server/services/canonicalLiquidityState";
import { getAzuroGraphqlEndpoint } from "~/services/azuro";

export type MarketBreadthMover = {
  marketId: string;
  label: string;
  sport: string;
  league: string;
  fills24h: number;
  volume24h: number;
  predictions: number;
};

/** Global protocol + market breadth — real DB / liquidity only (PR12). */
export const getProtocolMarketBreadth = baseProcedure.query(async () => {
  const checkedAt = new Date().toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    openOrders,
    openMarketsGroup,
    fillsCount24h,
    openInterestAgg,
    uniqueWallets24h,
    payouts24h,
    curatedOpen,
    cronHeartbeat,
    lastSettlementTx,
    recentFills,
    recentSettlements,
    oraclePendingOrders,
    liveDbMarkets,
    activityByMarket,
    canonical,
  ] = await Promise.all([
    db.order.count({ where: { status: "open" } }),
    db.order.groupBy({ by: ["marketId"], where: { status: "open" } }),
    db.order.count({ where: { createdAt: { gte: since24h } } }),
    db.order.aggregate({
      where: { status: "open" },
      _sum: { amount: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: since24h } },
      select: { wallet: true },
      distinct: ["wallet"],
    }),
    db.transaction.count({
      where: {
        type: { in: ["position_settlement_win", "position_settlement_loss"] },
        createdAt: { gte: since24h },
      },
    }),
    db.curatedEvent.count({ where: { isActive: true } }),
    db.botHeartbeat.findUnique({ where: { id: "settlement-cron" } }),
    db.transaction.findFirst({
      where: {
        type: { in: ["position_settlement_win", "position_settlement_loss"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        marketId: true,
        wallet: true,
        outcome: true,
        amount: true,
        status: true,
        createdAt: true,
        market: { select: { event: true, sport: true } },
      },
    }),
    db.transaction.findMany({
      where: {
        type: { in: ["position_settlement_win", "position_settlement_loss"] },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        type: true,
        amount: true,
        marketId: true,
        createdAt: true,
      },
    }),
    db.order.count({
      where: {
        status: "open",
        market: { closesAt: { lt: now }, status: "open" },
      },
    }),
    db.market.count({
      where: { status: "open", closesAt: { gt: now } },
    }),
    db.order.groupBy({
      by: ["marketId"],
      where: { createdAt: { gte: since24h } },
      _count: { id: true },
      _sum: { amount: true },
    }),
    resolveCanonicalLiquidityState(),
  ]);

  const openInterest = openInterestAgg._sum.amount ?? 0;
  const totalLiquidity = canonical.totalLiquidity;
  const utilizationPct =
    totalLiquidity > 0 ? Math.min(100, (openInterest / totalLiquidity) * 100) : 0;

  const topActivityIds = [...activityByMarket]
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 8)
    .map((r) => r.marketId);

  const moverMarkets =
    topActivityIds.length > 0
      ? await db.market.findMany({
          where: { id: { in: topActivityIds } },
          select: {
            id: true,
            event: true,
            sport: true,
            league: true,
            volume: true,
            predictions: true,
          },
        })
      : [];

  const marketById = new Map(moverMarkets.map((m) => [m.id, m]));
  const activityById = new Map(activityByMarket.map((r) => [r.marketId, r]));

  const biggestMovers: MarketBreadthMover[] = topActivityIds
    .map((id) => {
      const m = marketById.get(id);
      const act = activityById.get(id);
      if (!m || !act) return null;
      return {
        marketId: m.id,
        label: m.event,
        sport: m.sport,
        league: m.league,
        fills24h: act._count.id,
        volume24h: m.volume,
        predictions: m.predictions,
      };
    })
    .filter((x): x is MarketBreadthMover => x != null);

  const endingSoonCount = await db.market.count({
    where: {
      status: "open",
      closesAt: { gt: now, lt: new Date(now.getTime() + 3 * 60 * 60 * 1000) },
    },
  });

  return {
    checkedAt,
    azuroEndpoint: getAzuroGraphqlEndpoint(),
    pulse: {
      openOrders,
      openMarkets: openMarketsGroup.length,
      fills24h: fillsCount24h,
      activeWallets24h: uniqueWallets24h.length,
      payouts24h,
      oracleQueue: oraclePendingOrders,
      liveMarkets: liveDbMarkets,
      curatedOpen,
      lastSettlementTickAt: cronHeartbeat?.lastRun?.toISOString() ?? null,
      lastPayoutAt: lastSettlementTx?.createdAt?.toISOString() ?? null,
      endingSoonCount,
    },
    liquidity: {
      totalLiquidity,
      openInterest,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
      protocolMode: canonical.protocolMode,
      marketsActive: canonical.canonicalOpenSlots,
      allocationCoherent: canonical.allocationCoherent,
    },
    biggestMovers,
    recentFills: recentFills.map((o) => ({
      orderId: o.id,
      marketId: o.marketId,
      marketLabel: o.market?.event ?? o.marketId,
      sport: o.market?.sport ?? "",
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
