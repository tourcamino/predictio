import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import { clientChainScopeForTrpc } from '~/utils/walletQuery';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Trophy,
  ExternalLink,
  Gift,
} from 'lucide-react';
import type { LedgerHistoryFilter } from '~/lib/ledger/ledgerTransactionTypes';
import { dbActivityAmountPrefix, dbActivityTypeLabel } from '~/lib/wallet/dbActivityDisplay';

interface TransactionHistoryProps {
  walletAddress: string;
  compact?: boolean;
  limit?: number;
}

export function TransactionHistory({ 
  walletAddress, 
  compact = false, 
  limit = 20 
}: TransactionHistoryProps) {
  const trpc = useTRPC();
  const { chainId } = useWallet();
  const chainScope = clientChainScopeForTrpc(chainId);
  const [transactionType, setTransactionType] = useState<LedgerHistoryFilter>('all');
  const [transactionOffset, setTransactionOffset] = useState(0);

  const transactionHistoryQuery = useQuery({
    ...trpc.getTransactionHistory.queryOptions({
      walletAddress,
      limit,
      offset: transactionOffset,
      type: transactionType,
      clientChainId: chainScope,
    }),
    enabled: !!walletAddress,
  });

  if (!compact) {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all' as const, label: 'All' },
            { value: 'credits' as const, label: 'Credits' },
            { value: 'wallet_deposit' as const, label: 'Wallet deposit' },
            { value: 'wallet_withdrawal' as const, label: 'Wallet withdrawal' },
            { value: 'position_open' as const, label: 'Open' },
            { value: 'position_sell' as const, label: 'Sell' },
            { value: 'position_settlement_win' as const, label: 'Settle win' },
            { value: 'position_settlement_loss' as const, label: 'Settle loss' },
            { value: 'lp_deposit' as const, label: 'LP in' },
            { value: 'lp_withdraw' as const, label: 'LP out' },
            { value: 'lp_reward_claim' as const, label: 'LP fees' },
            { value: 'holding_reward' as const, label: 'Holding' },
            { value: 'analyst_reward' as const, label: 'Analyst' },
            { value: 'affiliate_reward' as const, label: 'Affiliate' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setTransactionType(filter.value);
                setTransactionOffset(0);
              }}
              className={`px-4 py-2 border rounded-lg transition-all text-sm font-medium ${
                transactionType === filter.value
                  ? 'bg-brand-green/20 border-brand-green text-brand-green'
                  : 'bg-white/5 border-white/10 hover:border-brand-green'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        {transactionHistoryQuery.isLoading ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
            <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Loading transactions...</p>
          </div>
        ) : transactionHistoryQuery.isError ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-500">Failed to load transaction history</p>
          </div>
        ) : transactionHistoryQuery.data?.transactions.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No transactions found</p>
            <p className="text-sm text-gray-500">Your transaction history will appear here</p>
          </div>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">TX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {transactionHistoryQuery.data?.transactions.map((tx) => {
                      const t = tx.type;
                      const isDeposit = t === 'wallet_deposit' || t === 'deposit';
                      const isWithdrawal = t === 'wallet_withdrawal' || t === 'withdrawal';
                      const isBet =
                        t === 'position_open' || t === 'bet_placed';
                      const isWin =
                        t === 'position_settlement_win' || t === 'bet_won';
                      const isLoss =
                        t === 'position_settlement_loss' || t === 'bet_lost';
                      const isReward =
                        t === 'holding_reward' ||
                        t === 'analyst_reward' ||
                        t === 'affiliate_reward' ||
                        t === 'lp_reward_claim' ||
                        t === 'reward_claim' ||
                        t === 'lp_fee_claim';
                      const isLpMove = t === 'lp_deposit' || t === 'lp_withdraw';
                      const isSell = t === 'position_sell';

                      const typeConfig =
                        {
                          wallet_deposit: { icon: ArrowDownCircle, color: 'text-brand-green' },
                          deposit: { icon: ArrowDownCircle, color: 'text-brand-green' },
                          wallet_withdrawal: { icon: ArrowUpCircle, color: 'text-yellow-400' },
                          withdrawal: { icon: ArrowUpCircle, color: 'text-yellow-400' },
                          position_open: { icon: TrendingUp, color: 'text-brand-cyan' },
                          bet_placed: { icon: TrendingUp, color: 'text-brand-cyan' },
                          position_sell: { icon: TrendingUp, color: 'text-brand-cyan' },
                          position_settlement_win: { icon: Trophy, color: 'text-brand-green' },
                          bet_won: { icon: Trophy, color: 'text-brand-green' },
                          position_settlement_loss: { icon: TrendingDown, color: 'text-red-400' },
                          bet_lost: { icon: TrendingDown, color: 'text-red-400' },
                          position_refund: { icon: RefreshCw, color: 'text-gray-400' },
                          bet_refund: { icon: RefreshCw, color: 'text-gray-400' },
                          lp_deposit: { icon: ArrowDownCircle, color: 'text-brand-cyan' },
                          lp_withdraw: { icon: ArrowUpCircle, color: 'text-yellow-400' },
                          lp_reward_claim: { icon: Gift, color: 'text-brand-green' },
                          holding_reward: { icon: Gift, color: 'text-brand-green' },
                          analyst_reward: { icon: Gift, color: 'text-brand-green' },
                          affiliate_reward: { icon: Gift, color: 'text-brand-green' },
                          reward_claim: { icon: Gift, color: 'text-brand-green' },
                          lp_fee_claim: { icon: Gift, color: 'text-brand-green' },
                        }[t] || { icon: Calendar, color: 'text-gray-400' };

                      const Icon = typeConfig.icon;
                      const metadata = tx.metadata as any;
                      const prefix = dbActivityAmountPrefix(tx);

                      return (
                        <tr key={tx.id} className="hover:bg-white/5">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                              <span className="font-semibold text-sm">{dbActivityTypeLabel(t)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {isBet || isWin || isLoss || isSell ? (
                              <div>
                                <div className="font-medium text-sm">
                                  {metadata?.marketEvent || tx.market?.event || 'Unknown Market'}
                                </div>
                                {metadata?.outcome && (
                                  <div className="text-xs text-gray-500">
                                    {metadata.outcome} @ {metadata.odds}x
                                  </div>
                                )}
                                {isSell && typeof metadata?.realizedPnL === 'number' ? (
                                  <div className="text-xs text-gray-500">
                                    Realized PnL {metadata.realizedPnL >= 0 ? '+' : ''}$
                                    {Number(metadata.realizedPnL).toFixed(2)}
                                  </div>
                                ) : null}
                              </div>
                            ) : isReward || isLpMove ? (
                              <div className="text-sm text-gray-300">
                                {metadata?.description ||
                                  metadata?.label ||
                                  tx.market?.event ||
                                  (isLpMove ? 'Liquidity' : 'Credit')}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">
                                {isDeposit ? 'Wallet funding in' : isWithdrawal ? 'Wallet funding out' : '—'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className={`font-mono font-semibold ${
                                prefix === '+'
                                  ? 'text-brand-green'
                                  : prefix === '-'
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                              }`}
                            >
                              {prefix}${tx.amount.toLocaleString()}
                            </div>
                            {metadata?.potentialWin && isBet && (
                              <div className="text-xs text-gray-500">
                                Potential: ${metadata.potentialWin.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              tx.status === 'completed' ? 'bg-brand-green/20 text-brand-green' :
                              tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-red-500/20 text-red-500'
                            }`}>
                              {tx.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(tx.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {tx.txHash ? (
                              <a
                                href={`https://basescan.org/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-brand-cyan hover:text-brand-cyan/80 text-xs"
                              >
                                <span className="font-mono">{tx.txHash.slice(0, 6)}...</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-500 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {(transactionHistoryQuery.data?.hasMore || transactionOffset > 0) && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setTransactionOffset(Math.max(0, transactionOffset - limit))}
                  disabled={transactionOffset === 0}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Showing {transactionOffset + 1} - {transactionOffset + (transactionHistoryQuery.data?.transactions.length || 0)} of {transactionHistoryQuery.data?.totalCount}
                </span>
                <button
                  onClick={() => setTransactionOffset(transactionOffset + limit)}
                  disabled={!transactionHistoryQuery.data?.hasMore}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Compact view for wallet tab
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h3 className="font-syne font-bold text-lg mb-4">Recent Transactions</h3>
      {transactionHistoryQuery.isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 text-brand-green mx-auto mb-2 animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      ) : transactionHistoryQuery.data?.transactions.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No transactions yet</p>
      ) : (
        <div className="space-y-3">
          {transactionHistoryQuery.data?.transactions.slice(0, 5).map((tx) => {
            const prefix = dbActivityAmountPrefix(tx);
            return (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                <div>
                  <div className="font-semibold text-sm">{dbActivityTypeLabel(tx.type)}</div>
                  {tx.txHash && (
                    <div className="text-xs text-gray-500 font-mono">
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono ${
                      prefix === '+' ? 'text-brand-green' : prefix === '-' ? 'text-red-400' : 'text-gray-400'
                    }`}
                  >
                    {prefix}${tx.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
