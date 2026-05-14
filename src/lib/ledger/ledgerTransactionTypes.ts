/**
 * Canonical `Transaction.type` strings (exchange-style ledger).
 * Shared by server writers, Prisma migrations, and client filters / labels.
 */
export const LEDGER_TRANSACTION_TYPES = [
  "wallet_deposit",
  "wallet_withdrawal",
  "position_open",
  "position_sell",
  "position_settlement_win",
  "position_settlement_loss",
  "position_refund",
  "lp_deposit",
  "lp_withdraw",
  "lp_reward_claim",
  "holding_reward",
  "analyst_reward",
  "affiliate_reward",
] as const;

export type LedgerTransactionType = (typeof LEDGER_TRANSACTION_TYPES)[number];

export const LEDGER_TRANSACTION_TYPE_SET = new Set<string>(LEDGER_TRANSACTION_TYPES);

/** Inbound credits (filters, `/portfolio/claims`). */
export const LEDGER_CREDIT_TYPES: LedgerTransactionType[] = [
  "position_settlement_win",
  "position_refund",
  "lp_reward_claim",
  "holding_reward",
  "analyst_reward",
  "affiliate_reward",
];

/** Filters for `getTransactionHistory` + UI type pickers. */
export const LEDGER_HISTORY_FILTERS = [
  "all",
  "credits",
  ...LEDGER_TRANSACTION_TYPES,
] as const;

export type LedgerHistoryFilter = (typeof LEDGER_HISTORY_FILTERS)[number];

export function isCanonicalLedgerType(t: string): t is LedgerTransactionType {
  return LEDGER_TRANSACTION_TYPE_SET.has(t);
}
