/**
 * Paper oracle / settlement contract (single place for semantics).
 *
 * INPUT (resolved mutation):
 * - marketId
 * - canonical binary outcome: YES | NO (paper moneyline)
 * - oracleSource, oracleConditionId?, oracleObservedAt (audit)
 * - settlementVersion (bump if payout rules change)
 *
 * OUTPUT (atomic batch):
 * - Market row → resolved + winner (once)
 * - Orders → resolved + pnl (each at most once)
 * - Transaction ledger rows (at most one settlement row per order)
 * - User balances / wins / losses (consistent with orders)
 * - Post-commit: notifications + points (idempotent side-effects)
 */

export const SETTLEMENT_VERSION = 1 as const;

export type PaperOracleSource = "azuro_graphql" | "client_poll" | "paper_admin" | "autonomous_bot" | "unknown";

export type PaperSettlementOracleInput = {
  source: PaperOracleSource;
  /** Azuro condition id when available */
  conditionId?: string | null;
  /** When the oracle was observed (ISO or Date) */
  observedAt: Date;
  /** Raw string from indexer before normalization (audit) */
  rawOutcome?: string | null;
};

export type PaperSettlementInput = {
  marketId: string;
  /** Canonical paper outcome side */
  winningOutcome: "YES" | "NO";
  oracle: PaperSettlementOracleInput;
  settlementVersion?: typeof SETTLEMENT_VERSION;
};

export type PaperSettlementOrderResult = {
  orderId: string;
  wallet: string;
  claimed: boolean;
  isWinner: boolean;
  payout: number;
  pnl: number;
};

export type PaperSettlementRunResult = {
  settlementRunId: string;
  idempotent: boolean;
  idempotentReason?:
    | "market_already_resolved_same_winner"
    | "market_already_resolved_conflict"
    | "no_open_orders";
  marketUpdated: boolean;
  orders: PaperSettlementOrderResult[];
  /** Sum of orders actually settled this run */
  settledThisRun: number;
};
