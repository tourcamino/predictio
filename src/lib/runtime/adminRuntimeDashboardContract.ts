/**
 * Runtime / ops dashboard DTOs — **shape only** for future admin UI + HTTP routes.
 * Reconciliation engine returns `RuntimeReconciliationResult`; dashboards aggregate runs over time.
 */

import type { RuntimeReconciliationResult } from "./runtimeReconciliationTypes";

/** Single inspector row (latest run or pinned market). */
export type ReconciliationInspectorRow = {
  runId: string;
  checkedAt: string;
  overall: RuntimeReconciliationResult["health"]["overall"];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
};

/** Stale markets widget — denormalized for tables. */
export type StaleMarketDashboardRow = {
  marketId: string;
  lifecyclePhase: "LOCKED" | "RESOLVING" | "DISPUTED";
  hoursInPhase: number;
  closesAt: string;
  dbStatus: string;
};

/** Settlement diagnostics — one row per market under investigation. */
export type SettlementDiagnosticsRow = {
  marketId: string;
  dbStatus: string | null;
  winner: string | null;
  resolvedAt: string | null;
  openOrderCount: number;
  resolvedOrderWithoutSettlementTx: number;
  refundLedgerGapCount: number;
};

/** Future `GET /api/admin/runtime/summary` response. */
export type RuntimeDashboardSummaryContract = {
  generatedAt: string;
  latestReconciliation: ReconciliationInspectorRow | null;
  staleMarketsSample: StaleMarketDashboardRow[];
  settlementHotspots: SettlementDiagnosticsRow[];
};
