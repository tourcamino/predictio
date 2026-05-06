import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { Clock, TrendingUp, TrendingDown, Filter, Download } from 'lucide-react';
interface OrderHistoryProps {
  walletAddress: string;
}

type FilterType = 'all' | 'buy' | 'sell' | 'win' | 'loss';

export function OrderHistory({ walletAddress }: OrderHistoryProps) {
  const trpc = useTRPC();
  const [filter, setFilter] = useState<FilterType>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const transactionsQuery = useQuery({
    ...trpc.getTransactionHistory.queryOptions({
      walletAddress,
      limit: 100,
      offset: 0,
    }),
    enabled: !!walletAddress,
  });

  const transactions = transactionsQuery.data?.transactions || [];

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Time range filter
    const txDate = new Date(tx.createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (timeRange === '7d' && daysDiff > 7) return false;
    if (timeRange === '30d' && daysDiff > 30) return false;
    if (timeRange === '90d' && daysDiff > 90) return false;

    // Type filter
    if (filter === 'all') return true;
    if (filter === 'buy') return tx.type === 'bet_placed';
    if (filter === 'sell') return tx.type === 'bet_won' || tx.type === 'bet_lost';
    if (filter === 'win') return tx.type === 'bet_won';
    if (filter === 'loss') return tx.type === 'bet_lost';
    
    return true;
  });

  const handleExport = () => {
    // Convert to CSV
    const headers = ['Date', 'Type', 'Market', 'Outcome', 'Amount', 'P&L', 'Balance'];
    const rows = filteredTransactions.map((tx) => {
      const metadata = tx.metadata as any;
      return [
        new Date(tx.createdAt).toISOString(),
        tx.type,
        metadata?.marketEvent || 'N/A',
        metadata?.outcome || 'N/A',
        tx.amount.toFixed(2),
        tx.type === 'bet_won' ? `+${tx.amount.toFixed(2)}` : tx.type === 'bet_lost' ? `-${tx.amount.toFixed(2)}` : '0.00',
        tx.balanceAfter?.toFixed(2) || 'N/A',
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictio-order-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-syne font-bold text-xl">Order History</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>
        
        {/* Type Filter */}
        <div className="flex gap-2">
          {(['all', 'buy', 'sell', 'win', 'loss'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-brand-green text-brand-bg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Time Range Filter */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                timeRange === range
                  ? 'bg-brand-cyan text-brand-bg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {transactionsQuery.isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-3 animate-spin" />
          <p>Loading order history...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No orders found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const metadata = tx.metadata as any;
            const isProfit = tx.type === 'bet_won';
            const isLoss = tx.type === 'bet_lost';
            const isTrade = tx.type === 'bet_placed';

            return (
              <div
                key={tx.id}
                className={`p-4 rounded-lg border transition-all hover:border-brand-green/50 ${
                  isProfit
                    ? 'bg-brand-green/5 border-brand-green/30'
                    : isLoss
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isProfit && <TrendingUp className="w-5 h-5 text-brand-green" />}
                      {isLoss && <TrendingDown className="w-5 h-5 text-red-500" />}
                      {isTrade && <Clock className="w-5 h-5 text-brand-cyan" />}
                      
                      <div>
                        <div className="font-semibold">
                          {isTrade && 'Order Placed'}
                          {isProfit && 'Position Won'}
                          {isLoss && 'Position Lost'}
                        </div>
                        {metadata?.marketEvent && (
                          <div className="text-sm text-gray-400">{metadata.marketEvent}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {metadata?.outcome && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Outcome:</span>
                          <span className={`font-semibold ${
                            metadata.outcome === 'YES' ? 'text-brand-green' : 'text-red-500'
                          }`}>
                            {metadata.outcome}
                          </span>
                        </div>
                      )}
                      
                      {metadata?.odds && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Odds:</span>
                          <span className="font-mono font-semibold">{metadata.odds.toFixed(2)}x</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Fee:</span>
                        <span className="font-mono text-xs">${tx.feePaid.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-bold text-xl mb-1 ${
                      isProfit
                        ? 'text-brand-green'
                        : isLoss
                        ? 'text-red-500'
                        : 'text-white'
                    }`}>
                      {isProfit && '+'}
                      {isLoss && '-'}
                      ${tx.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
                    </div>
                    {tx.balanceAfter !== null && (
                      <div className="text-xs text-gray-500 mt-1">
                        Balance: ${tx.balanceAfter.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Orders</div>
              <div className="font-mono font-bold text-lg">{filteredTransactions.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Volume</div>
              <div className="font-mono font-bold text-lg">
                ${filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Fees</div>
              <div className="font-mono font-bold text-lg text-gray-500">
                ${filteredTransactions.reduce((sum, tx) => sum + tx.feePaid, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
