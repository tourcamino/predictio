import { db } from "~/server/db";
import {
  computeCanonicalMarketAllocations,
  curatedMarketIdFromGameId,
  pickWeightSource,
  type CanonicalMarketLiquidityRow,
  type LiquidityAllocationSlot,
  type LiquidityWeightSource,
} from "~/server/services/canonicalLiquidityAllocation";
import {
  getProtocolLiquidityConfigFromEnv,
  type ProtocolLiquidityMode,
} from "~/lib/protocolLiquidityMode";
import {
  enrichCanonicalStateWithVault,
  type CanonicalVaultAllocationSnapshot,
  type VaultAlignmentReport,
} from "~/server/services/catalogLiquidityRebalance";
import { filterCuratedRowsForProductPhase } from "~/lib/catalog/productCatalogFilter";

export const CANONICAL_OPEN_MARKET_CAP = 9;

export type CanonicalAllocationMode =
  | "pre-testnet-simulated"
  | "testnet-simulated-plus-external";

export type CanonicalLiquidityDiagnostics = {
  weightSource: LiquidityWeightSource;
  curatedOpenCount: number;
  matchedMarketRows: number;
  totalCanonicalVolume: number;
  appealScoreSum: number;
  orphanAllocationCount: number;
  staleExposureMarketIds: string[];
};

export type CanonicalLiquidityState = {
  at: string;
  protocolMode: ProtocolLiquidityMode;
  allocationMode: CanonicalAllocationMode;
  totalSimulatedLiquidity: number;
  externalLpTotal: number;
  totalLiquidity: number;
  canonicalOpenSlots: number;
  allocationSum: number;
  allocationCoherent: boolean;
  liquidityPerMarket: CanonicalMarketLiquidityRow[];
  allocationByMarketId: Record<string, CanonicalMarketLiquidityRow>;
  diagnostics: CanonicalLiquidityDiagnostics;
  allocationVersion: string;
  rebalanceTriggeredAt: string;
  vaultSnapshots: CanonicalVaultAllocationSnapshot[];
  vaultAlignment: VaultAlignmentReport;
};

function allocationModeFor(
  mode: ProtocolLiquidityMode,
  externalLpTotal: number,
): CanonicalAllocationMode {
  if (mode === "PRE_TESTNET") return "pre-testnet-simulated";
  return externalLpTotal > 0
    ? "testnet-simulated-plus-external"
    : "pre-testnet-simulated";
}

async function loadOpenCuratedSlots(): Promise<LiquidityAllocationSlot[]> {
  const curatedRaw = await db.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    orderBy: [{ importanceScore: "desc" }, { startsAt: "asc" }],
    take: CANONICAL_OPEN_MARKET_CAP,
    select: {
      gameId: true,
      homeTeam: true,
      awayTeam: true,
      leagueName: true,
      importanceScore: true,
      sport: true,
      sportSlug: true,
      startsAt: true,
    },
  });

  const curated = filterCuratedRowsForProductPhase(curatedRaw);

  if (curated.length === 0) return [];

  const marketIds = curated.map((c) => curatedMarketIdFromGameId(c.gameId));
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [markets, openInterestRows, recentOrders] = await Promise.all([
    db.market.findMany({
      where: { id: { in: marketIds } },
      select: { id: true, volume: true, event: true, league: true, sport: true, predictions: true },
    }),
    db.order.groupBy({
      by: ["marketId"],
      where: { marketId: { in: marketIds }, status: "open" },
      _sum: { amount: true },
    }),
    db.order.groupBy({
      by: ["marketId"],
      where: { marketId: { in: marketIds }, createdAt: { gte: since24h } },
      _count: { _all: true },
    }),
  ]);
  const marketById = new Map(markets.map((m) => [m.id, m]));
  const oiByMarket = new Map(openInterestRows.map((r) => [r.marketId, r._sum.amount ?? 0]));
  const fillsByMarket = new Map(recentOrders.map((r) => [r.marketId, r._count._all]));

  return curated.map((c) => {
    const marketId = curatedMarketIdFromGameId(c.gameId);
    const m = marketById.get(marketId);
    return {
      marketId,
      gameId: c.gameId,
      marketName: m?.event ?? `${c.homeTeam} vs ${c.awayTeam}`,
      league: m?.league ?? c.leagueName,
      sport: m?.sport ?? c.sportSlug ?? c.sport ?? "unknown",
      appealScore: c.importanceScore ?? 0,
      volume: m?.volume ?? 0,
      startsAtMs: c.startsAt?.getTime(),
      openInterestUsd: oiByMarket.get(marketId) ?? 0,
      traderCount: m?.predictions ?? 0,
      recentFillCount24h: fillsByMarket.get(marketId) ?? 0,
    };
  });
}

async function loadOpenCuratedGameIds(): Promise<Set<string>> {
  const rowsRaw = await db.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: { gameId: true, sport: true, sportSlug: true },
    take: CANONICAL_OPEN_MARKET_CAP,
  });
  const rows = filterCuratedRowsForProductPhase(rowsRaw);
  return new Set(rows.map((r) => r.gameId));
}

export async function resolveCanonicalLiquidityState(): Promise<CanonicalLiquidityState> {
  const config = getProtocolLiquidityConfigFromEnv();
  const at = new Date().toISOString();

  const [slots, openGameIds, lpAgg] = await Promise.all([
    loadOpenCuratedSlots(),
    loadOpenCuratedGameIds(),
    db.liquidityPosition.aggregate({
      where: { status: "active" },
      _sum: { depositedAmount: true },
    }),
  ]);

  const externalLpTotal = lpAgg._sum.depositedAmount ?? 0;
  const simulated = config.simulatedLiquidityUsdc;
  const totalLiquidity =
    config.mode === "PRE_TESTNET" ? simulated : simulated + externalLpTotal;

  const weightSource = pickWeightSource(slots);
  const liquidityPerMarket = computeCanonicalMarketAllocations(
    slots,
    totalLiquidity,
    weightSource,
  );

  const allocationSum = liquidityPerMarket.reduce((s, r) => s + r.allocation, 0);
  const staleExposureMarketIds = liquidityPerMarket
    .filter((r) => !openGameIds.has(r.gameId))
    .map((r) => r.marketId);

  const allocationByMarketId: Record<string, CanonicalMarketLiquidityRow> = {};
  for (const row of liquidityPerMarket) {
    allocationByMarketId[row.marketId] = row;
  }

  const base = {
    at,
    protocolMode: config.mode,
    allocationMode: allocationModeFor(config.mode, externalLpTotal),
    totalSimulatedLiquidity: simulated,
    externalLpTotal,
    totalLiquidity,
    canonicalOpenSlots: slots.length,
    allocationSum,
    allocationCoherent:
      slots.length === 0 || Math.abs(allocationSum - totalLiquidity) < 0.02,
    liquidityPerMarket,
    allocationByMarketId,
    diagnostics: {
      weightSource,
      curatedOpenCount: slots.length,
      matchedMarketRows: slots.filter((s) => s.volume > 0).length,
      totalCanonicalVolume: slots.reduce((s, x) => s + x.volume, 0),
      appealScoreSum: slots.reduce((s, x) => s + x.appealScore, 0),
      orphanAllocationCount: staleExposureMarketIds.length,
      staleExposureMarketIds,
    },
  };

  return enrichCanonicalStateWithVault(base, "canonical_resolve");
}

export type { CanonicalMarketLiquidityRow, LiquidityWeightSource };
