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

/**
 * Legacy `Transaction.type` values still in VPS Postgres from Express paper writes.
 * Canonical filter → all DB types that should match that UI bucket.
 */
export const LEDGER_FILTER_DB_TYPES: Partial<
  Record<LedgerHistoryFilter, readonly string[]>
> = {
  position_open: ["position_open", "bet_placed"],
  position_sell: ["position_sell"],
  position_settlement_win: ["position_settlement_win", "bet_won"],
  position_settlement_loss: ["position_settlement_loss", "bet_lost"],
  position_refund: ["position_refund", "bet_refund"],
  wallet_deposit: ["wallet_deposit", "deposit"],
  wallet_withdrawal: ["wallet_withdrawal", "withdrawal"],
  lp_reward_claim: ["lp_reward_claim", "lp_fee_claim", "reward_claim"],
};

/** Prisma `where.type` for history filters (Express + tRPC). */
export function ledgerHistoryTypeWhere(
  filter: LedgerHistoryFilter,
): { type: string } | { type: { in: string[] } } | Record<string, never> {
  if (filter === "all") {
    return {};
  }
  if (filter === "credits") {
    return { type: { in: [...LEDGER_CREDIT_TYPES] } };
  }
  const expanded = LEDGER_FILTER_DB_TYPES[filter];
  if (expanded && expanded.length > 0) {
    return { type: { in: [...expanded] } };
  }
  return { type: filter };
}
