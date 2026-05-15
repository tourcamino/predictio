import type { RuntimeHealthSummary } from "./runtimeHealthTypes";

/** Canonical severity for operator triage (maps into `RuntimeHealthSummary` buckets). */
export const RuntimeReconciliationIssueSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;

export type RuntimeReconciliationIssueSeverity =
  (typeof RuntimeReconciliationIssueSeverity)[keyof typeof RuntimeReconciliationIssueSeverity];

export type RuntimeReconciliationIssueCategory =
  | "LIFECYCLE"
  | "LEDGER"
  | "SETTLEMENT"
  | "ORACLE"
  | "STALE"
  | "PORTFOLIO"
  | "DATA_INTEGRITY";

/** Stable codes for alerting / future self-heal routing (`runtimeSelfHealingContract`). */
export type RuntimeReconciliationIssueCode =
  | "RESOLVED_MARKET_OPEN_ORDERS"
  | "REFUND_LEDGER_MISSING"
  | "SETTLEMENT_TX_MISSING"
  | "STALE_LOCKED"
  | "STALE_RESOLVING"
  | "STALE_DISPUTED"
  | "DUPLICATE_SETTLEMENT_LEDGER"
  | "LEDGER_BALANCE_TAIL_MISMATCH"
  | "ORACLE_DB_WINNER_MISMATCH"
  | "ORACLE_VS_DB_SKIPPED_NO_NETWORK"
  | "ORPHAN_LEDGER_ORDER_REF"
  | "SETTLEMENT_INCOMPLETE_AGGREGATE";

export type RuntimeReconciliationIssue = {
  severity: RuntimeReconciliationIssueSeverity;
  category: RuntimeReconciliationIssueCategory;
  issueCode: RuntimeReconciliationIssueCode;
  description: string;
  detectedAt: string;
  suggestedAction: string;
  marketId?: string;
  orderId?: string;
  /** Prisma `User.id` when resolved; otherwise omitted. */
  userId?: string;
  /** Wallet (lowercase) for paper ledger correlation. */
  userWallet?: string;
  /** Optional diagnostic bag (counts, hours, oracle snippet). */
  context?: Record<string, unknown>;
};

export type RuntimeReconciliationResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  issues: RuntimeReconciliationIssue[];
  health: RuntimeHealthSummary;
  /** Histogram for metrics sinks / logs. */
  issueCodeCounts: Record<string, number>;
  truncated: boolean;
};
