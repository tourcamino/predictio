/**
 * Canonical Market Liquidity State — single source of truth for catalog ↔ vault ↔ LP routing.
 * PRE_TESTNET: one simulated budget split across CuratedEvent OPEN only.
 * TESTNET: simulated seed + real external LP deposits (visible balances).
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
import {
  applyFootballLiquidityWeightBoost,
  compareFootballFirstLiquidity,
} from "./footballFirstLiquidity";
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

async function loadOpenCuratedSlots(
  prisma: PrismaClient,
): Promise<LiquidityAllocationSlot[]> {
  const curatedOpen = await prisma.curatedEvent.findMany({
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
  });

  const curated = [...curatedOpen]
    .sort(compareFootballFirstLiquidity)
    .slice(0, CANONICAL_OPEN_MARKET_CAP);

  if (curated.length === 0) return [];

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
      sport: m?.sport ?? c.sportSlug ?? c.sport ?? "football",
      appealScore: c.importanceScore ?? 0,
      volume: m?.volume ?? 0,
    };
  });
}

/** OPEN curated game ids only — used to detect orphan/stale exposure. */
async function loadOpenCuratedGameIds(prisma: PrismaClient): Promise<Set<string>> {
  const rows = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: { gameId: true },
    take: CANONICAL_OPEN_MARKET_CAP,
  });
  return new Set(rows.map((r) => r.gameId));
}

export async function resolveCanonicalLiquidityState(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CanonicalLiquidityState> {
  const config = getProtocolLiquidityConfigFromEnv(env);
  const at = new Date().toISOString();

  const [slots, openGameIds, lpAgg] = await Promise.all([
    loadOpenCuratedSlots(prisma),
    loadOpenCuratedGameIds(prisma),
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
    },
  };

  const enriched = enrichCanonicalStateWithVault(base, "canonical_resolve");

  console.log(
    JSON.stringify({
      tag: "canonical_liquidity_state",
      openMarkets: enriched.canonicalOpenSlots,
      allocationSum: enriched.allocationSum,
      totalSimulatedLiquidity: enriched.totalSimulatedLiquidity,
      allocationMode: enriched.allocationMode,
      allocationVersion: enriched.allocationVersion,
      orphanCount: enriched.diagnostics.orphanAllocationCount,
    }),
  );

  return enriched;
}

/** Catalog-debug / admin snapshot (subset of full state). */
export function canonicalLiquidityDebugPayload(state: CanonicalLiquidityState) {
  return {
    allocationMode: state.allocationMode,
    protocolMode: state.protocolMode,
    canonicalOpenSlots: state.canonicalOpenSlots,
    totalSimulatedLiquidity: state.totalSimulatedLiquidity,
    totalLiquidity: state.totalLiquidity,
    allocationSum: state.allocationSum,
    allocationCoherent: state.allocationCoherent,
    weightSource: state.diagnostics.weightSource,
    liquidityPerMarket: state.liquidityPerMarket.map((r) => ({
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
    note: "OPEN CuratedEvent only — LOCKED/RESOLVED/inactive excluded",
  };
}

export type { CanonicalVaultAllocationSnapshot, VaultAlignmentReport };

export type { CanonicalMarketLiquidityRow, LiquidityWeightSource };
export { computeCanonicalMarketAllocations, curatedMarketIdFromGameId };
