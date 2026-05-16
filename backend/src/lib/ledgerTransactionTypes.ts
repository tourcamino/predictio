/** Keep in sync with `src/lib/ledger/ledgerTransactionTypes.ts` (Express cannot import outside backend rootDir). */

export type TransactionHistoryFilter =
  | "all"
  | "credits"
  | "wallet_deposit"
  | "wallet_withdrawal"
  | "position_open"
  | "position_sell"
  | "position_settlement_win"
  | "position_settlement_loss"
  | "position_refund"
  | "lp_deposit"
  | "lp_withdraw"
  | "lp_reward_claim"
  | "holding_reward"
  | "analyst_reward"
  | "affiliate_reward"
  | string;

const LEDGER_CREDIT_TYPES = [
  "position_settlement_win",
  "position_refund",
  "lp_reward_claim",
  "holding_reward",
  "analyst_reward",
  "affiliate_reward",
] as const;

const LEDGER_FILTER_DB_TYPES: Partial<
  Record<TransactionHistoryFilter, readonly string[]>
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

export function ledgerHistoryTypeWhere(
  filter: TransactionHistoryFilter,
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
