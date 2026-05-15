/**
 * Future self-healing actions — **contracts only**. No automatic execution in v1.
 * Callers (admin jobs, on-call playbooks) will map `RuntimeReconciliationIssue` → intent here.
 */

export type SelfHealActionKind =
  | "replay_settlement"
  | "replay_refund"
  | "retry_notification"
  | "retry_reward"
  | "admin_manual_resolution";

/** Placeholder payload for durable job queue / admin UI (not executed by reconciliation engine). */
export type PendingSelfHealAction = {
  id: string;
  kind: SelfHealActionKind;
  marketId?: string;
  orderId?: string;
  userWallet?: string;
  /** Serialized admin intent; mirrors `AdminRuntimeIntent` where applicable. */
  payload: Record<string, unknown>;
  createdAt: string;
  dryRun: boolean;
};

/** Maps an issue code to a suggested self-heal kind (operator guidance, not automation). */
export function suggestedSelfHealKindForIssue(issueCode: string): SelfHealActionKind | null {
  switch (issueCode) {
    case "SETTLEMENT_TX_MISSING":
    case "RESOLVED_MARKET_OPEN_ORDERS":
      return "replay_settlement";
    case "REFUND_LEDGER_MISSING":
      return "replay_refund";
    case "DUPLICATE_SETTLEMENT_LEDGER":
      return "admin_manual_resolution";
    case "LEDGER_BALANCE_TAIL_MISMATCH":
      return "admin_manual_resolution";
    case "ORACLE_DB_WINNER_MISMATCH":
      return "admin_manual_resolution";
    case "ORPHAN_LEDGER_ORDER_REF":
      return "admin_manual_resolution";
    default:
      return null;
  }
}
