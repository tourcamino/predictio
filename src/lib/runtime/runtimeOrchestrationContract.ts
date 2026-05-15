/**
 * Runtime orchestration contract — **documentation + types**, not an execution graph.
 * Settlement side effects must flow through explicit engines (`paperSettlementEngine`, `paperRefundEngine`, …)
 * with idempotency keys; this module names the **stages** so schedulers stay thin triggers.
 *
 * ## Canonical pipeline (paper + oracle)
 *
 * 1. **ORACLE_POLL** — `checkResolvedMarkets` / Azuro GraphQL (read-only external I/O).
 * 2. **CLASSIFICATION** — `oracleOutcome` / `kind`: BINARY | REFUND | DISPUTE.
 * 3. **SETTLEMENT_ENGINE** — `runPaperBatchSettlement` | `runPaperRefundSettlement` | dispute procedure.
 * 4. **LEDGER_WRITES** — `Transaction` rows + `User.virtualBalance` inside the same DB transaction as order updates.
 * 5. **NOTIFICATIONS** — `createNotification` (must remain best-effort; never drive settlement truth).
 * 6. **RECONCILIATION_VERIFY** — `runRuntimeReconciliation` in `~/lib/runtime/runtimeReconciliationEngine.ts` (read-only drift detection; no writes in v1).
 *
 * Anti-patterns to avoid:
 * - A single `setInterval` that fetches oracle **and** mutates markets **and** sends toasts.
 * - Client-only polling as the **only** settlement driver for production (use cron/VPS ticks + optional client acceleration).
 * - Notifications that imply payout happened before ledger commit succeeds.
 */

export const RuntimeOrchestrationStage = {
  ORACLE_POLL: "ORACLE_POLL",
  CLASSIFICATION: "CLASSIFICATION",
  SETTLEMENT_ENGINE: "SETTLEMENT_ENGINE",
  LEDGER_WRITES: "LEDGER_WRITES",
  NOTIFICATIONS: "NOTIFICATIONS",
  RECONCILIATION_VERIFY: "RECONCILIATION_VERIFY",
} as const;

export type RuntimeOrchestrationStage =
  (typeof RuntimeOrchestrationStage)[keyof typeof RuntimeOrchestrationStage];

/** Ordered list for dashboards / future workflow engine. */
export const RUNTIME_ORCHESTRATION_ORDER: readonly RuntimeOrchestrationStage[] = [
  RuntimeOrchestrationStage.ORACLE_POLL,
  RuntimeOrchestrationStage.CLASSIFICATION,
  RuntimeOrchestrationStage.SETTLEMENT_ENGINE,
  RuntimeOrchestrationStage.LEDGER_WRITES,
  RuntimeOrchestrationStage.NOTIFICATIONS,
  RuntimeOrchestrationStage.RECONCILIATION_VERIFY,
] as const;

// --- Admin / operations intents (no implementation here; stable API for future tooling) ---

export type AdminReplaySettlementIntent = {
  kind: "replay_settlement";
  marketId: string;
  /** When true, engines should log only and skip writes (future). */
  dryRun: boolean;
};

export type AdminRetryRefundIntent = {
  kind: "retry_refund";
  marketId: string;
  dryRun: boolean;
};

export type AdminManualDisputeResolveIntent = {
  kind: "manual_dispute_resolve";
  marketId: string;
  targetStatus: "RESOLVED" | "REFUNDED" | "RESOLVING";
  dryRun: boolean;
};

export type AdminRetryNotificationIntent = {
  kind: "retry_notifications";
  walletAddress?: string;
  dryRun: boolean;
};

export type AdminReplayRewardsIntent = {
  kind: "retry_rewards";
  walletAddress?: string;
  dryRun: boolean;
};

export type AdminRuntimeIntent =
  | AdminReplaySettlementIntent
  | AdminRetryRefundIntent
  | AdminManualDisputeResolveIntent
  | AdminRetryNotificationIntent
  | AdminReplayRewardsIntent;

/** Suggested Postgres advisory lock key namespace for future mutating reconciliation (must stay stable). */
export const RECONCILIATION_ADVISORY_LOCK_KEY = 0x50ed_10c0; // "PRED_IOCO"-ish uint31
