import { createFileRoute, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { Download, Filter, Search, ChevronDown, ExternalLink, ArrowDownCircle, ArrowUpCircle, Trophy, TrendingUp, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CHAIN_CONFIG } from '~/config/chain';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';
import { useTransactionHistory } from '~/hooks/useTransactionHistory';
import {
  LEDGER_HISTORY_FILTERS,
  type LedgerHistoryFilter,
} from '~/lib/ledger/ledgerTransactionTypes';
import {
  dbActivityAmountPrefix,
  dbActivityLedgerLegacyWarning,
  dbActivityPrimaryLine,
  dbActivitySecondaryLine,
  dbActivityTypeLabel,
} from '~/lib/wallet/dbActivityDisplay';

export const Route = createFileRoute('/wallet/transactions/')({
  component: WalletTransactionHistoryPage,
});

type TransactionStatus = 'all' | 'completed' | 'pending' | 'failed';

const PAGE_SIZE = 25;

function WalletTransactionHistoryPage() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected } = useWallet();

  const [typeFilter, setTypeFilter] = useState<LedgerHistoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const historyQuery = useTransactionHistory({
    limit: PAGE_SIZE,
    offset,
    type: typeFilter,
    enabled: isConnected,
  });

  const rows = historyQuery.data?.transactions ?? [];

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((tx) => {
      const statusMatch = statusFilter === 'all' || tx.status === statusFilter;
      if (!statusMatch) return false;
      if (!q) return true;
      const blob = `${dbActivityPrimaryLine(tx)} ${dbActivityTypeLabel(tx.type)} ${tx.txHash ?? ''} ${tx.id}`.toLowerCase();
      return blob.includes(q);
    });
  }, [rows, searchQuery, statusFilter]);

  const handleExportCSV = () => {
    const csvHeader = 'Date,Type,Primary,Amount,Fee,Status,TX Hash,Id\n';
    const csvRows = filteredTransactions.map((tx) => {
      const date = new Date(tx.createdAt).toISOString();
      const primary = dbActivityPrimaryLine(tx).replace(/,/g, ';');
      const amount = tx.amount.toFixed(2);
      const fee = tx.feePaid?.toFixed(2) ?? '0.00';
      const txHash = tx.txHash || '';
      return `${date},${tx.type},${primary},${amount},${fee},${tx.status},${txHash},${tx.id}`;
    }).join('\n');

    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictio-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const onFilterTypeChange = (v: LedgerHistoryFilter) => {
    setTypeFilter(v);
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-syne font-bold text-4xl">Activity ledger</h1>
              <Link
                to="/wallet"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                ← Back to Wallet
              </Link>
            </div>
            <p className="text-gray-400">Server-backed history for this wallet (tRPC · Prisma `Transaction`).</p>
            {import.meta.env.DEV && import.meta.env.VITE_ACTIVITY_DEBUG === '1' ? (
              <p className="text-xs text-amber-200/90 mt-2 font-mono">
                activity source=db chainScope={chainScope} updatedAt={historyQuery.dataUpdatedAt || '—'} fetch=
                {historyQuery.fetchStatus}
              </p>
            ) : null}
          </div>

          {!isConnected ? (
            <GuestPageState onConnect={() => requireWallet()} />
          ) : (
            <>
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => onFilterTypeChange(e.target.value as LedgerHistoryFilter)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                      {LEDGER_HISTORY_FILTERS.map((v) => (
                        <option key={v} value={v}>
                          {v === 'all' ? 'All' : v === 'credits' ? 'Credits (bucket)' : dbActivityTypeLabel(v)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as TransactionStatus)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                      <option value="all">All</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-2">Search (this page)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Market, type, hash, id…"
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <div className="text-sm text-gray-400">
                    Page {Math.floor(offset / PAGE_SIZE) + 1} · showing {filteredTransactions.length} of {rows.length}{' '}
                    loaded rows
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={filteredTransactions.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {historyQuery.isLoading ? (
                <div className="p-12 text-center text-gray-400">Loading…</div>
              ) : historyQuery.isError ? (
                <div className="p-12 text-center text-red-300 text-sm">Failed to load ledger.</div>
              ) : filteredTransactions.length > 0 ? (
                <div className="space-y-2">
                  {filteredTransactions.map((tx) => {
                    const isExpanded = expandedTxId === tx.id;
                    const explorerUrl =
                      CHAIN_CONFIG.explorerUrl && tx.txHash ? `${CHAIN_CONFIG.explorerUrl}/tx/${tx.txHash}` : null;
                    const prefix = dbActivityAmountPrefix(tx);
                    const secondary = dbActivitySecondaryLine(tx);
                    const icon =
                      tx.type === 'wallet_deposit' || tx.type === 'deposit' ? (
                        <ArrowDownCircle className="w-5 h-5" />
                      ) : tx.type === 'wallet_withdrawal' || tx.type === 'withdrawal' ? (
                        <ArrowUpCircle className="w-5 h-5" />
                      ) : tx.type === 'position_settlement_win' ||
                        tx.type === 'lp_reward_claim' ||
                        tx.type === 'holding_reward' ||
                        tx.type === 'analyst_reward' ||
                        tx.type === 'affiliate_reward' ||
                        tx.type === 'bet_won' ||
                        tx.type === 'reward_claim' ||
                        tx.type === 'lp_fee_claim' ? (
                        <Trophy className="w-5 h-5" />
                      ) : tx.type === 'position_open' || tx.type === 'bet_placed' || tx.type === 'position_sell' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <Wallet className="w-5 h-5" />
                      );
                    const iconWrap =
                      tx.type === 'wallet_deposit' || tx.type === 'deposit'
                        ? 'bg-brand-green/20 text-brand-green'
                        : tx.type === 'wallet_withdrawal' || tx.type === 'withdrawal'
                          ? 'bg-red-500/20 text-red-500'
                          : tx.type === 'position_settlement_win' ||
                              tx.type === 'lp_reward_claim' ||
                              tx.type === 'holding_reward' ||
                              tx.type === 'analyst_reward' ||
                              tx.type === 'affiliate_reward' ||
                              tx.type === 'bet_won' ||
                              tx.type === 'reward_claim' ||
                              tx.type === 'lp_fee_claim'
                            ? 'bg-purple-500/20 text-purple-400'
                            : tx.type === 'position_open' || tx.type === 'bet_placed' || tx.type === 'position_sell'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400';

                    return (
                      <div key={tx.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                          className="w-full p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-4 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconWrap}`}
                              >
                                {icon}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-semibold">{dbActivityTypeLabel(tx.type)}</span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      tx.status === 'completed'
                                        ? 'bg-brand-green/20 text-brand-green'
                                        : tx.status === 'pending'
                                          ? 'bg-yellow-500/20 text-yellow-500'
                                          : 'bg-red-500/20 text-red-500'
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-400 truncate">{dbActivityPrimaryLine(tx)}</div>
                                {secondary ? (
                                  <div className="text-xs text-gray-500 truncate">{secondary}</div>
                                ) : null}
                                <div className="text-xs text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleString()}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-right">
                                <div
                                  className={`font-mono font-bold text-lg ${
                                    prefix === '+' ? 'text-brand-green' : prefix === '-' ? 'text-red-400' : 'text-white'
                                  }`}
                                >
                                  {prefix}${tx.amount.toFixed(2)}
                                </div>
                                {tx.feePaid > 0 ? (
                                  <div className="text-xs text-gray-500">Fee: ${tx.feePaid.toFixed(2)}</div>
                                ) : null}
                              </div>
                              <ChevronDown
                                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-white/10">
                            <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                              <div>
                                <div className="text-xs text-gray-400 mb-1">Semantic type</div>
                                <div className="font-mono text-xs">{tx.type}</div>
                                {dbActivityLedgerLegacyWarning(tx.type) ? (
                                  <div className="text-[10px] text-amber-200 mt-1">
                                    {dbActivityLedgerLegacyWarning(tx.type)}
                                  </div>
                                ) : null}
                              </div>
                              <div>
                                <div className="text-xs text-gray-400 mb-1">Row id</div>
                                <div className="font-mono text-xs break-all">{tx.id}</div>
                              </div>
                              {tx.txHash ? (
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">TX hash</div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs truncate">{tx.txHash}</span>
                                    {explorerUrl ? (
                                      <a
                                        href={explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-brand-green flex-shrink-0"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                              {tx.marketId ? (
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">Market</div>
                                  <Link
                                    to="/markets/$marketId"
                                    params={{ marketId: tx.marketId }}
                                    className="text-brand-green hover:text-brand-green/80 text-sm"
                                  >
                                    Open market →
                                  </Link>
                                </div>
                              ) : null}
                              {typeof tx.balanceBefore === 'number' && typeof tx.balanceAfter === 'number' ? (
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">Balance before → after</div>
                                  <div className="font-mono text-xs">
                                    ${tx.balanceBefore.toFixed(2)} → ${tx.balanceAfter.toFixed(2)}
                                  </div>
                                </div>
                              ) : null}
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
                  <p className="text-gray-400 mb-2">No rows match</p>
                  <p className="text-sm text-gray-500">Try another type or clear search</p>
                </div>
              )}

              {historyQuery.data && (historyQuery.data.hasMore || offset > 0) ? (
                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!historyQuery.data.hasMore}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}
