/**
 * Pre-testnet read model: vault exposure targets = canonical CuratedEvent OPEN set.
 * Does not write DB, create Market rows, or move funds — mirrors future vault → market-pool routing.
 */
import { db } from "~/server/db";

/** Aligns with public catalog cap; not a new product limit. */
export const VAULT_CANONICAL_MARKET_CAP = 9;

/**
 * Min aggregate paper volume (USDC) on canonical slots before weights use real volume.
 * Below this, weights follow curated appeal (`importanceScore` = appealScore).
 */
export const MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS = 50;

export type VaultAllocationSource = "real-market-volume" | "curated-appeal-fallback";

export type VaultExposureSlot = {
  /** Stable pool id: `azuro-{gameId}` (matches paper Market id when created). */
  marketId: string;
  gameId: string;
  marketName: string;
  league: string;
  sport: string;
  importanceScore: number;
  /** Observed paper volume on linked Market row, else 0. */
  volume: number;
};

export type VaultExposureDiagnostics = {
  allocationSource: VaultAllocationSource;
  curatedOpenCount: number;
  matchedMarketRows: number;
  totalCanonicalVolume: number;
  appealScoreSum: number;
};

export type ResolvedVaultCanonicalExposure = {
  slots: VaultExposureSlot[];
  allocationSource: VaultAllocationSource;
  marketsActive: number;
  diagnostics: VaultExposureDiagnostics;
};

export type VaultAllocationRow = {
  marketId: string;
  marketName: string;
  league: string;
  sport: string;
  sportEmoji: string;
  allocation: number;
  percentage: number;
  volume: number;
};

function curatedMarketId(gameId: string): string {
  return `azuro-${gameId}`;
}

/**
 * Canonical active market pools for vault UI: CuratedEvent OPEN + isActive, appeal order.
 */
export async function resolveVaultCanonicalExposure(): Promise<ResolvedVaultCanonicalExposure> {
  const emptyDiagnostics = (
    source: VaultAllocationSource,
  ): VaultExposureDiagnostics => ({
    allocationSource: source,
    curatedOpenCount: 0,
    matchedMarketRows: 0,
    totalCanonicalVolume: 0,
    appealScoreSum: 0,
  });

  let curated: Array<{
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    leagueName: string;
    importanceScore: number;
  }>;

  try {
    curated = await db.curatedEvent.findMany({
      where: { isActive: true, status: "OPEN" },
      orderBy: [{ importanceScore: "desc" }, { startsAt: "asc" }],
      take: VAULT_CANONICAL_MARKET_CAP,
      select: {
        gameId: true,
        homeTeam: true,
        awayTeam: true,
        leagueName: true,
        importanceScore: true,
      },
    });
  } catch (err) {
    console.warn(
      "[vaultCuratedExposureBridge] CuratedEvent lookup failed:",
      err instanceof Error ? err.message : err,
    );
    return {
      slots: [],
      allocationSource: "curated-appeal-fallback",
      marketsActive: 0,
      diagnostics: emptyDiagnostics("curated-appeal-fallback"),
    };
  }

  if (curated.length === 0) {
    return {
      slots: [],
      allocationSource: "curated-appeal-fallback",
      marketsActive: 0,
      diagnostics: emptyDiagnostics("curated-appeal-fallback"),
    };
  }

  const marketIds = curated.map((c) => curatedMarketId(c.gameId));
  let markets: Array<{
    id: string;
    volume: number;
    event: string;
    league: string;
    sport: string;
  }> = [];

  try {
    markets = await db.market.findMany({
      where: { id: { in: marketIds } },
      select: { id: true, volume: true, event: true, league: true, sport: true },
    });
  } catch (err) {
    console.warn(
      "[vaultCuratedExposureBridge] Market lookup failed:",
      err instanceof Error ? err.message : err,
    );
  }

  const marketById = new Map(markets.map((m) => [m.id, m]));

  const slots: VaultExposureSlot[] = curated.map((c) => {
    const marketId = curatedMarketId(c.gameId);
    const m = marketById.get(marketId);
    return {
      marketId,
      gameId: c.gameId,
      marketName: m?.event ?? `${c.homeTeam} vs ${c.awayTeam}`,
      league: m?.league ?? c.leagueName,
      sport: m?.sport ?? "football",
      importanceScore: c.importanceScore ?? 0,
      volume: m?.volume ?? 0,
    };
  });

  const totalCanonicalVolume = slots.reduce((sum, s) => sum + s.volume, 0);
  const appealScoreSum = slots.reduce((sum, s) => sum + s.importanceScore, 0);
  const allocationSource: VaultAllocationSource =
    totalCanonicalVolume >= MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS
      ? "real-market-volume"
      : "curated-appeal-fallback";

  const diagnostics: VaultExposureDiagnostics = {
    allocationSource,
    curatedOpenCount: curated.length,
    matchedMarketRows: markets.length,
    totalCanonicalVolume,
    appealScoreSum,
  };

  if (process.env.NODE_ENV === "development") {
    console.debug(
      "[vaultCuratedExposureBridge]",
      JSON.stringify({
        ...diagnostics,
        marketsActive: slots.length,
        topSlots: slots.slice(0, 3).map((s) => ({
          marketId: s.marketId,
          appeal: s.importanceScore,
          volume: s.volume,
        })),
      }),
    );
  }

  return {
    slots,
    allocationSource,
    marketsActive: slots.length,
    diagnostics,
  };
}

/**
 * Intended vault exposure per canonical pool (not traded volume fiction).
 */
export function buildVaultAllocationRows(
  slots: VaultExposureSlot[],
  allocationSource: VaultAllocationSource,
  totalLiquidity: number,
  getSportEmoji: (sport: string) => string,
): VaultAllocationRow[] {
  if (slots.length === 0 || totalLiquidity <= 0) return [];

  const rawWeights = slots.map((slot) => {
    if (allocationSource === "real-market-volume") return slot.volume;
    return Math.max(0, slot.importanceScore);
  });

  let weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const useEqualSplit = weightSum <= 0;
  if (useEqualSplit) weightSum = slots.length;

  const rows = slots.map((slot, i) => {
    const weight = useEqualSplit ? 1 / slots.length : rawWeights[i]! / weightSum;
    return {
      marketId: slot.marketId,
      marketName: slot.marketName,
      league: slot.league,
      sport: slot.sport,
      sportEmoji: getSportEmoji(slot.sport),
      allocation: Math.round(totalLiquidity * weight * 100) / 100,
      percentage: Math.round(weight * 100 * 100) / 100,
      volume: slot.volume,
    };
  });

  const sum = rows.reduce((s, r) => s + r.allocation, 0);
  const drift = Math.round((totalLiquidity - sum) * 100) / 100;
  if (rows.length > 0 && Math.abs(drift) >= 0.01) {
    rows[0] = {
      ...rows[0]!,
      allocation: Math.round((rows[0]!.allocation + drift) * 100) / 100,
    };
  }

  rows.sort((a, b) => b.allocation - a.allocation);
  return rows;
}
