import { createFileRoute, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { Download, Filter, Search, ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { CHAIN_CONFIG } from '~/config/chain';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';

export const Route = createFileRoute('/wallet/transactions/')({
  component: TransactionHistory,
});

type TransactionType = 'all' | 'buy' | 'sell' | 'claim' | 'deposit' | 'withdraw' | 'send' | 'refund';
type TransactionStatus = 'all' | 'confirmed' | 'pending' | 'failed';

function TransactionHistory() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, transactions } = useWallet();
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const typeMatch = typeFilter === 'all' || tx.type === typeFilter;
    const statusMatch = statusFilter === 'all' || tx.status === statusFilter;
    const searchMatch =
      searchQuery === '' ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.txHash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return typeMatch && statusMatch && searchMatch;
  });

  const handleExportCSV = () => {
    const csvHeader = 'Date,Type,Description,Amount,Fee,Status,TX Hash\n';
    const csvRows = filteredTransactions.map((tx) => {
      const date = new Date(tx.timestamp).toISOString();
      const amount = tx.amountUsdc.toFixed(2);
      const fee = tx.feePaid?.toFixed(2) || '0.00';
      const txHash = tx.txHash || '';
      
      return `${date},${tx.type},${tx.description},${amount},${fee},${tx.status},${txHash}`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictio-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-syne font-bold text-4xl">Transactions</h1>
              <Link
                to="/wallet"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                ← Back to Wallet
              </Link>
            </div>
            <p className="text-gray-400">All your activity on Predictio</p>
          </div>

          {!isConnected ? (
            <GuestPageState onConnect={() => requireWallet()} />
          ) : (
          <>
          {/* Filters */}
          <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TransactionType)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value="all">All</option>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                  <option value="claim">Claim</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                  <option value="send">Send</option>
                  <option value="refund">Refund</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TransactionStatus)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value="all">All</option>
                  <option value="confirmed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by description or TX hash..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <div className="text-sm text-gray-400">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </div>
              <button
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const isExpanded = expandedTxId === tx.id;
                const explorerUrl = CHAIN_CONFIG.explorerUrl && tx.txHash
                  ? `${CHAIN_CONFIG.explorerUrl}/tx/${tx.txHash}`
                  : null;

                return (
                  <div
                    key={tx.id}
                    className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                      className="w-full p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            tx.type === 'deposit' ? 'bg-brand-green/20 text-brand-green' :
                            tx.type === 'withdraw' ? 'bg-red-500/20 text-red-500' :
                            tx.type === 'claim' ? 'bg-purple-500/20 text-purple-500' :
                            tx.type === 'buy' ? 'bg-blue-500/20 text-blue-500' :
                            tx.type === 'sell' ? 'bg-orange-500/20 text-orange-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {tx.type === 'deposit' && '📥'}
                            {tx.type === 'withdraw' && '📤'}
                            {tx.type === 'claim' && '💰'}
                            {tx.type === 'buy' && '🟢'}
                            {tx.type === 'sell' && '🔴'}
                            {tx.type === 'refund' && '↩️'}
                            {tx.type === 'send' && '📨'}
                          </div>

                          {/* Info */}
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold capitalize">{tx.type}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                tx.status === 'confirmed' ? 'bg-brand-green/20 text-brand-green' :
                                tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-red-500/20 text-red-500'
                              }`}>
                                {tx.status === 'confirmed' && '✓ Completed'}
                                {tx.status === 'pending' && '⏳ Pending'}
                                {tx.status === 'failed' && '✗ Failed'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400">{tx.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`font-mono font-bold text-lg ${
                              tx.type === 'deposit' || tx.type === 'claim' ? 'text-brand-green' :
                              tx.type === 'withdraw' || tx.type === 'buy' ? 'text-red-500' :
                              'text-white'
                            }`}>
                              {(tx.type === 'deposit' || tx.type === 'claim') && '+'}
                              {(tx.type === 'withdraw' || tx.type === 'buy') && '-'}
                              ${tx.amountUsdc.toFixed(2)}
                            </div>
                            {tx.feePaid && tx.feePaid > 0 && (
                              <div className="text-xs text-gray-500">
                                Fee: ${tx.feePaid.toFixed(2)}
                              </div>
                            )}
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Transaction ID</div>
                            <div className="font-mono text-sm">{tx.id}</div>
                          </div>
                          {tx.txHash && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">TX Hash</div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm truncate">{tx.txHash.slice(0, 16)}...</span>
                                {explorerUrl && (
                                  <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-green hover:text-brand-green/80"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                          {tx.marketId && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Market</div>
                              <Link
                                to="/markets/$marketId"
                                params={{ marketId: tx.marketId }}
                                className="text-sm text-brand-green hover:text-brand-green/80"
                              >
                                View Market →
                              </Link>
                            </div>
                          )}
                          {tx.gasUsed && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Gas Used</div>
                              <div className="text-sm">{tx.gasUsed.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
              <Filter className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No transactions found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters</p>
            </div>
          )}
          </>
          )}
        </div>
      </div>
      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}

