/**
 * Vinxi mirror of backend catalogLiquidityRebalance (version + snapshots).
 */
import { createHash } from "crypto";
import type {
  CanonicalAllocationMode,
  CanonicalLiquidityState,
} from "~/server/services/canonicalLiquidityState";

export type CanonicalVaultAllocationSnapshot = {
  marketId: string;
  gameId: string;
  appealScore: number;
  allocation: number;
  allocationWeight: number;
  allocationMode: CanonicalAllocationMode;
  source: "canonical-liquidity-state";
  timestamp: string;
};

export type VaultAlignmentReport = {
  canonicalOpenMarkets: number;
  vaultAllocatedMarkets: number;
  orphanVaultAllocations: number;
  allocationCoherent: boolean;
  rebalanceTriggeredAt: string;
  allocationVersion: string;
};

export type CatalogLiquidityChangeEvent = {
  allocationVersion: string;
  rebalanceTriggeredAt: string;
  reason: string;
  changed: boolean;
};

const g = globalThis as typeof globalThis & {
  __predictioAllocationVersion?: string;
  __predictioRebalanceAt?: string;
  __predictioCatalogFingerprint?: string;
};

export function computeCatalogFingerprint(
  slots: Array<{ gameId: string; appealScore: number }>,
): string {
  const payload = slots
    .map((s) => `${s.gameId}:${Math.round(s.appealScore)}`)
    .sort()
    .join("|");
  return createHash("sha256").update(payload || "empty").digest("hex").slice(0, 16);
}

export function recordCatalogRebalance(
  fingerprint: string,
  reason: string,
): CatalogLiquidityChangeEvent {
  const prev = g.__predictioCatalogFingerprint ?? "";
  const changed = fingerprint !== prev;
  if (changed) {
    g.__predictioCatalogFingerprint = fingerprint;
    g.__predictioAllocationVersion = fingerprint;
    g.__predictioRebalanceAt = new Date().toISOString();
    console.log(
      JSON.stringify({
        tag: "vault_catalog_rebalance",
        reason,
        allocationVersion: fingerprint,
      }),
    );
  }
  return {
    allocationVersion: g.__predictioAllocationVersion ?? fingerprint,
    rebalanceTriggeredAt: g.__predictioRebalanceAt ?? new Date().toISOString(),
    reason,
    changed,
  };
}

export function buildVaultAllocationSnapshots(
  state: CanonicalLiquidityCore,
): CanonicalVaultAllocationSnapshot[] {
  const ts = state.at;
  const total = state.totalLiquidity;
  return state.liquidityPerMarket.map((row) => ({
    marketId: row.marketId,
    gameId: row.gameId,
    appealScore: row.appealScore,
    allocation: row.allocation,
    allocationWeight:
      total > 0 ? Math.round((row.allocation / total) * 10000) / 10000 : 0,
    allocationMode: state.allocationMode,
    source: "canonical-liquidity-state",
    timestamp: ts,
  }));
}

export function buildVaultAlignment(
  state: CanonicalLiquidityCore,
  rebalance: CatalogLiquidityChangeEvent,
): VaultAlignmentReport {
  return {
    canonicalOpenMarkets: state.canonicalOpenSlots,
    vaultAllocatedMarkets: state.liquidityPerMarket.length,
    orphanVaultAllocations: state.diagnostics.orphanAllocationCount,
    allocationCoherent:
      state.allocationCoherent &&
      state.liquidityPerMarket.length === state.canonicalOpenSlots,
    rebalanceTriggeredAt: rebalance.rebalanceTriggeredAt,
    allocationVersion: rebalance.allocationVersion,
  };
}

export type CanonicalLiquidityCore = Omit<
  CanonicalLiquidityState,
  | "allocationVersion"
  | "rebalanceTriggeredAt"
  | "vaultSnapshots"
  | "vaultAlignment"
>;

export function enrichCanonicalStateWithVault(
  state: CanonicalLiquidityCore,
  rebalanceReason: string,
): CanonicalLiquidityState {
  const fingerprint = computeCatalogFingerprint(
    state.liquidityPerMarket.map((r) => ({
      gameId: r.gameId,
      appealScore: r.appealScore,
    })),
  );
  const rebalance = recordCatalogRebalance(fingerprint, rebalanceReason);
  return {
    ...state,
    allocationVersion: rebalance.allocationVersion,
    rebalanceTriggeredAt: rebalance.rebalanceTriggeredAt,
    vaultSnapshots: buildVaultAllocationSnapshots(state),
    vaultAlignment: buildVaultAlignment(state, rebalance),
  };
}
