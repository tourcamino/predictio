/**
 * Canonical Market Liquidity State — full OPEN registry participates in LP graph.
 */
import type { PrismaClient } from "@prisma/client";
import {
  computeCanonicalMarketAllocations,
  curatedMarketIdFromGameId,
  pickWeightSource,
  type CanonicalMarketLiquidityRow,
  type LiquidityAllocationSlot,
  type LiquidityWeightSource,
} from "./canonicalLiquidityAllocation";
import { compareFootballFirstLiquidity } from "./footballFirstLiquidity";
import {
  getProtocolLiquidityConfigFromEnv,
  type ProtocolLiquidityMode,
} from "./protocolLiquidityMode";
import {
  enrichCanonicalStateWithVault,
  vaultAlignmentDebugPayload,
  type CanonicalVaultAllocationSnapshot,
  type VaultAlignmentReport,
} from "./catalogLiquidityRebalance";
import {
  cacheLpGraphTelemetry,
  computeLpGraphTelemetry,
  type LpGraphTelemetry,
} from "./lpGraphTelemetry";
import { filterCuratedRowsForProductPhase } from "./productCatalogFilter";

export type { LpGraphTelemetry };

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
  lpGraph: LpGraphTelemetry;
};

export type CanonicalLiquidityState = {
  at: string;
  protocolMode: ProtocolLiquidityMode;
  allocationMode: CanonicalAllocationMode;
  totalSimulatedLiquidity: number;
  externalLpTotal: number;
  totalLiquidity: number;
  /** @deprecated Use lpGraph.LP_CONNECTED_MARKETS — all OPEN registry rows in graph */
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

function lpGraphMaxMarkets(): number {
  const n = Number(process.env.PREDICTIO_LP_GRAPH_MAX_MARKETS ?? "2500");
  return Number.isFinite(n) && n >= 50 ? Math.min(10000, Math.floor(n)) : 2500;
}

/** All OPEN curated events — full LP graph participation (no top-N slot cap). */
async function loadOpenCuratedSlots(
  prisma: PrismaClient,
): Promise<LiquidityAllocationSlot[]> {
  const curatedOpenRaw = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
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
    take: lpGraphMaxMarkets(),
    orderBy: [{ importanceScore: "desc" }, { startsAt: "asc" }],
  });

  const curatedOpen = filterCuratedRowsForProductPhase(curatedOpenRaw);

  if (curatedOpen.length === 0) return [];

  const curated = [...curatedOpen].sort(compareFootballFirstLiquidity);

  const marketIds = curated.map((c) => curatedMarketIdFromGameId(c.gameId));
  const markets = await prisma.market.findMany({
    where: { id: { in: marketIds } },
    select: { id: true, volume: true, event: true, league: true, sport: true, status: true },
  });
  const marketById = new Map(markets.map((m) => [m.id, m]));

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
      startsAtMs: c.startsAt.getTime(),
    };
  });
}

async function loadOpenCuratedGameIds(prisma: PrismaClient): Promise<Set<string>> {
  const rowsRaw = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: { gameId: true, sport: true, sportSlug: true },
    take: lpGraphMaxMarkets(),
  });
  const rows = filterCuratedRowsForProductPhase(rowsRaw);
  return new Set(rows.map((r) => r.gameId));
}

export async function resolveCanonicalLiquidityState(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CanonicalLiquidityState> {
  const config = getProtocolLiquidityConfigFromEnv(env);
  const at = new Date().toISOString();

  const [slots, openGameIds, registryOpenCount, lpAgg] = await Promise.all([
    loadOpenCuratedSlots(prisma),
    loadOpenCuratedGameIds(prisma),
    prisma.curatedEvent.count({ where: { isActive: true, status: "OPEN" } }),
    prisma.liquidityPosition
      .aggregate({
        where: { status: "active" },
        _sum: { depositedAmount: true },
      })
      .catch(() => ({ _sum: { depositedAmount: 0 } })),
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

  const totalCanonicalVolume = slots.reduce((s, x) => s + x.volume, 0);
  const appealScoreSum = slots.reduce((s, x) => s + x.appealScore, 0);

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
      totalCanonicalVolume,
      appealScoreSum,
      orphanAllocationCount: staleExposureMarketIds.length,
      staleExposureMarketIds,
      lpGraph: {
        LP_CONNECTED_MARKETS: 0,
        LP_MIN_ALLOCATED_MARKETS: 0,
        LP_ZERO_ALLOCATION_MARKETS: 0,
        LP_TOTAL_WEIGHT: 0,
        LP_TOP10_WEIGHT_SHARE: 0,
        LP_LONGTAIL_WEIGHT_SHARE: 0,
        ORPHAN_VAULT_COUNT: staleExposureMarketIds.length,
        REGISTRY_OPEN_COUNT: registryOpenCount,
      },
    },
  };

  const enriched = enrichCanonicalStateWithVault(base, "canonical_resolve");
  enriched.diagnostics.lpGraph = computeLpGraphTelemetry(enriched, registryOpenCount);
  cacheLpGraphTelemetry(enriched.diagnostics.lpGraph);

  console.log(
    JSON.stringify({
      tag: "full_lp_graph_state",
      LP_CONNECTED_MARKETS: enriched.diagnostics.lpGraph.LP_CONNECTED_MARKETS,
      REGISTRY_OPEN_COUNT: enriched.diagnostics.lpGraph.REGISTRY_OPEN_COUNT,
      allocationSum: enriched.allocationSum,
      LP_ZERO_ALLOCATION_MARKETS: enriched.diagnostics.lpGraph.LP_ZERO_ALLOCATION_MARKETS,
      LP_TOP10_WEIGHT_SHARE: enriched.diagnostics.lpGraph.LP_TOP10_WEIGHT_SHARE,
      allocationMode: enriched.allocationMode,
      allocationVersion: enriched.allocationVersion,
    }),
  );

  return enriched;
}

export function canonicalLiquidityDebugPayload(state: CanonicalLiquidityState) {
  return {
    allocationMode: state.allocationMode,
    protocolMode: state.protocolMode,
    canonicalOpenSlots: state.canonicalOpenSlots,
    lpGraph: state.diagnostics.lpGraph,
    totalSimulatedLiquidity: state.totalSimulatedLiquidity,
    totalLiquidity: state.totalLiquidity,
    allocationSum: state.allocationSum,
    allocationCoherent: state.allocationCoherent,
    weightSource: state.diagnostics.weightSource,
    liquidityPerMarket: state.liquidityPerMarket.slice(0, 12).map((r) => ({
      marketId: r.marketId,
      gameId: r.gameId,
      appealScore: r.appealScore,
      allocation: r.allocation,
      percentage: r.percentage,
    })),
    orphanAllocationCount: state.diagnostics.orphanAllocationCount,
    vaultAlignment: vaultAlignmentDebugPayload(
      state.vaultAlignment,
      state.vaultSnapshots,
    ),
    note: "Full OPEN registry LP graph — weighted allocation with per-market floor",
  };
}

export type { CanonicalVaultAllocationSnapshot, VaultAlignmentReport };
export type { CanonicalMarketLiquidityRow, LiquidityWeightSource };
export { computeCanonicalMarketAllocations, curatedMarketIdFromGameId };
