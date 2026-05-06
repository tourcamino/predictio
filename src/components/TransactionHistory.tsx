import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar, 
  Trophy,
  ExternalLink 
} from 'lucide-react';

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
  const [transactionType, setTransactionType] = useState<'all' | 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'bet_refund'>('all');
  const [transactionOffset, setTransactionOffset] = useState(0);

  const transactionHistoryQuery = useQuery({
    ...trpc.getTransactionHistory.queryOptions({
      walletAddress,
      limit,
      offset: transactionOffset,
      type: transactionType,
    }),
    enabled: !!walletAddress,
  });

  if (!compact) {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All Transactions' },
            { value: 'deposit', label: 'Deposits' },
            { value: 'withdrawal', label: 'Withdrawals' },
            { value: 'bet_placed', label: 'Bets Placed' },
            { value: 'bet_won', label: 'Wins' },
            { value: 'bet_lost', label: 'Losses' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setTransactionType(filter.value as any);
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
                      const isDeposit = tx.type === 'deposit';
                      const isWithdrawal = tx.type === 'withdrawal';
                      const isBet = tx.type === 'bet_placed';
                      const isWin = tx.type === 'bet_won';
                      const isLoss = tx.type === 'bet_lost';
                      
                      const typeConfig = {
                        deposit: { icon: ArrowDownCircle, color: 'text-brand-green', label: 'Deposit' },
                        withdrawal: { icon: ArrowUpCircle, color: 'text-yellow-400', label: 'Withdrawal' },
                        bet_placed: { icon: TrendingUp, color: 'text-brand-cyan', label: 'Bet Placed' },
                        bet_won: { icon: Trophy, color: 'text-brand-green', label: 'Win' },
                        bet_lost: { icon: TrendingDown, color: 'text-red-400', label: 'Loss' },
                        bet_refund: { icon: RefreshCw, color: 'text-gray-400', label: 'Refund' },
                      }[tx.type] || { icon: Calendar, color: 'text-gray-400', label: tx.type };

                      const Icon = typeConfig.icon;
                      const metadata = tx.metadata as any;

                      return (
                        <tr key={tx.id} className="hover:bg-white/5">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                              <span className="font-semibold text-sm">{typeConfig.label}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {isBet || isWin || isLoss ? (
                              <div>
                                <div className="font-medium text-sm">
                                  {metadata?.marketEvent || tx.market?.event || 'Unknown Market'}
                                </div>
                                {metadata?.outcome && (
                                  <div className="text-xs text-gray-500">
                                    {metadata.outcome} @ {metadata.odds}x
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">
                                {isDeposit ? 'USDC Deposit' : 'USDC Withdrawal'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-mono font-semibold ${
                              isDeposit || isWin ? 'text-brand-green' : 
                              isWithdrawal || isBet || isLoss ? 'text-red-400' : 
                              'text-gray-400'
                            }`}>
                              {isDeposit || isWin ? '+' : '-'}${tx.amount.toLocaleString()}
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
            const metadata = tx.metadata as any;
            return (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                <div>
                  <div className="font-semibold text-sm">
                    {tx.type === 'deposit' ? 'Deposit' :
                     tx.type === 'withdrawal' ? 'Withdrawal' :
                     tx.type === 'bet_placed' ? 'Bet Placed' :
                     tx.type === 'bet_won' ? 'Win' :
                     tx.type === 'bet_lost' ? 'Loss' : 'Transaction'}
                  </div>
                  {tx.txHash && (
                    <div className="text-xs text-gray-500 font-mono">
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`font-mono ${
                    tx.type === 'deposit' || tx.type === 'bet_won' ? 'text-brand-green' : 'text-red-400'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'bet_won' ? '+' : '-'}${tx.amount.toLocaleString()}
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
