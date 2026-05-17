import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '~/server/trpc/root';
import { LEDGER_TRANSACTION_TYPE_SET } from '~/lib/ledger/ledgerTransactionTypes';

export type DbActivityRow = inferRouterOutputs<AppRouter>['getTransactionHistory']['transactions'][number];

const TYPE_LABEL: Record<string, string> = {
  wallet_deposit: 'Wallet deposit',
  wallet_withdrawal: 'Wallet withdrawal',
  position_open: 'Position open',
  position_sell: 'Position sell (market)',
  position_settlement_win: 'Settlement (win)',
  position_settlement_loss: 'Settlement (loss)',
  position_refund: 'Refund / void',
  lp_deposit: 'LP deposit',
  lp_withdraw: 'LP withdraw',
  lp_reward_claim: 'LP fees claimed',
  holding_reward: 'Holding reward',
  analyst_reward: 'Analyst reward',
  affiliate_reward: 'Affiliate reward',
  // Legacy (pre-migration) — keep labels until DB fully migrated
  deposit: 'Deposit (legacy)',
  withdrawal: 'Withdrawal (legacy)',
  bet_placed: 'Bet placed (legacy)',
  bet_won: 'Win (legacy)',
  bet_lost: 'Loss (legacy)',
  bet_refund: 'Refund (legacy)',
  reward_claim: 'Reward (legacy)',
  lp_fee_claim: 'LP fee (legacy)',
};

export function dbActivityTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

/** UI lifecycle bucket for ledger rows (PR1). */
export function dbActivityLifecycleSemantic(type: string): string {
  if (type === 'position_open' || type === 'bet_placed') return 'OPEN_POSITION';
  if (type === 'position_sell') return 'SELL_POSITION';
  if (type === 'position_settlement_win' || type === 'bet_won') return 'SETTLEMENT_WIN';
  if (type === 'position_settlement_loss' || type === 'bet_lost') return 'SETTLEMENT_LOSS';
  if (type === 'position_refund' || type === 'bet_refund') return 'SETTLEMENT_REFUND';
  if (type === 'lp_deposit') return 'LP_ADD';
  if (type === 'lp_withdraw') return 'LP_REMOVE';
  if (type === 'wallet_deposit' || type === 'deposit') return 'WALLET_IN';
  if (type === 'wallet_withdrawal' || type === 'withdrawal') return 'WALLET_OUT';
  if (type.startsWith('lp_') || type.includes('reward')) return 'REWARDS';
  return 'OTHER';
}

export function dbActivityPrimaryLine(row: DbActivityRow): string {
  const m = row.metadata as Record<string, unknown> | undefined;
  const ev = row.market?.event?.trim();
  if (ev) return ev;
  if (typeof m?.marketEvent === 'string' && m.marketEvent.trim()) return m.marketEvent.trim();
  if (row.marketId) return `Market ${row.marketId.slice(0, 10)}…`;
  return dbActivityTypeLabel(row.type);
}

export function dbActivitySecondaryLine(row: DbActivityRow): string | null {
  const m = row.metadata as Record<string, unknown> | undefined;
  if (typeof m?.outcome === 'string') {
    const odds = typeof m.odds === 'number' && Number.isFinite(m.odds) ? ` @ ${m.odds}x` : '';
    return `${m.outcome}${odds}`;
  }
  if (row.type === 'position_sell' && typeof m?.realizedPnL === 'number') {
    const p = m.realizedPnL as number;
    return `Realized PnL ${p >= 0 ? '+' : ''}$${p.toFixed(2)}`;
  }
  return null;
}

/** Display sign for ledger rows (`amount` is magnitude for most credit events). */
export function dbActivityAmountPrefix(row: DbActivityRow): '+' | '-' | '' {
  const t = row.type;
  if (
    t === 'wallet_deposit' ||
    t === 'position_settlement_win' ||
    t === 'lp_reward_claim' ||
    t === 'holding_reward' ||
    t === 'analyst_reward' ||
    t === 'affiliate_reward' ||
    t === 'position_sell' ||
    t === 'lp_withdraw' ||
    t === 'position_refund' ||
    t === 'deposit' ||
    t === 'bet_won' ||
    t === 'reward_claim' ||
    t === 'lp_fee_claim'
  ) {
    return '+';
  }
  if (
    t === 'wallet_withdrawal' ||
    t === 'position_open' ||
    t === 'lp_deposit' ||
    t === 'withdrawal' ||
    t === 'bet_placed' ||
    t === 'bet_lost'
  ) {
    return '-';
  }
  if (t === 'position_settlement_loss') {
    return row.amount > 0 ? '+' : '';
  }
  return '';
}

/** Dev: surface rows that still use pre-canonical `type` strings. */
export function dbActivityLedgerLegacyWarning(type: string): string | null {
  if (import.meta.env.PROD) return null;
  if (LEDGER_TRANSACTION_TYPE_SET.has(type)) return null;
  return `legacy type: ${type}`;
}
