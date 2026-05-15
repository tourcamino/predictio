/**
 * Catalog-reactive vault rebalance — version fingerprint, snapshots, event bus (WS-ready).
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import type {
  CanonicalAllocationMode,
  CanonicalLiquidityState,
} from "./canonicalLiquidityState";

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

export type CanonicalLiquidityCore = Omit<
  CanonicalLiquidityState,
  | "allocationVersion"
  | "rebalanceTriggeredAt"
  | "vaultSnapshots"
  | "vaultAlignment"
>;

export type CatalogLiquidityChangeEvent = {
  allocationVersion: string;
  rebalanceTriggeredAt: string;
  reason: string;
  changed: boolean;
};

type CatalogLiquidityListener = (event: CatalogLiquidityChangeEvent) => void;

const g = globalThis as typeof globalThis & {
  __predictioCatalogLiquidityListeners?: Set<CatalogLiquidityListener>;
  __predictioAllocationVersion?: string;
  __predictioRebalanceAt?: string;
  __predictioCatalogFingerprint?: string;
};

function listenerSet(): Set<CatalogLiquidityListener> {
  if (!g.__predictioCatalogLiquidityListeners) {
    g.__predictioCatalogLiquidityListeners = new Set();
  }
  return g.__predictioCatalogLiquidityListeners;
}

export function onCatalogLiquidityChange(
  listener: CatalogLiquidityListener,
): () => void {
  listenerSet().add(listener);
  return () => listenerSet().delete(listener);
}

function emitCatalogLiquidityChange(event: CatalogLiquidityChangeEvent): void {
  for (const fn of listenerSet()) {
    try {
      fn(event);
    } catch (e) {
      console.warn(
        "[catalogLiquidityRebalance] listener error:",
        e instanceof Error ? e.message : e,
      );
    }
  }
}

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
        rebalanceTriggeredAt: g.__predictioRebalanceAt,
      }),
    );
  }

  const event: CatalogLiquidityChangeEvent = {
    allocationVersion: g.__predictioAllocationVersion ?? fingerprint,
    rebalanceTriggeredAt: g.__predictioRebalanceAt ?? new Date().toISOString(),
    reason,
    changed,
  };

  if (changed) emitCatalogLiquidityChange(event);
  return event;
}

export function getCatalogLiquidityVersionMeta(): {
  allocationVersion: string;
  rebalanceTriggeredAt: string;
} {
  return {
    allocationVersion: g.__predictioAllocationVersion ?? "bootstrap",
    rebalanceTriggeredAt: g.__predictioRebalanceAt ?? new Date(0).toISOString(),
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
  const openCount = state.canonicalOpenSlots;
  const allocated = state.liquidityPerMarket.length;
  return {
    canonicalOpenMarkets: openCount,
    vaultAllocatedMarkets: allocated,
    orphanVaultAllocations: state.diagnostics.orphanAllocationCount,
    allocationCoherent: state.allocationCoherent && allocated === openCount,
    rebalanceTriggeredAt: rebalance.rebalanceTriggeredAt,
    allocationVersion: rebalance.allocationVersion,
  };
}

export function vaultAlignmentDebugPayload(
  alignment: VaultAlignmentReport,
  snapshots: CanonicalVaultAllocationSnapshot[],
) {
  return {
    ...alignment,
    snapshotSample: snapshots.slice(0, 6).map((s) => ({
      marketId: s.marketId,
      allocation: s.allocation,
      weight: s.allocationWeight,
      source: s.source,
    })),
  };
}

/** After curated catalog mutations — bump version when OPEN set changes. */
export async function notifyCatalogLiquidityChanged(
  prisma: PrismaClient,
  reason: string,
): Promise<CatalogLiquidityChangeEvent> {
  const open = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: { gameId: true, importanceScore: true },
    orderBy: [{ importanceScore: "desc" }, { startsAt: "asc" }],
    take: 9,
  });
  const fingerprint = computeCatalogFingerprint(
    open.map((r) => ({
      gameId: r.gameId,
      appealScore: r.importanceScore ?? 0,
    })),
  );
  return recordCatalogRebalance(fingerprint, reason);
}

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
  const vaultSnapshots = buildVaultAllocationSnapshots(state);
  const vaultAlignment = buildVaultAlignment(state, rebalance);
  return {
    ...state,
    allocationVersion: rebalance.allocationVersion,
    rebalanceTriggeredAt: rebalance.rebalanceTriggeredAt,
    vaultSnapshots,
    vaultAlignment,
  };
}

