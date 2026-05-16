import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { useWallet } from '~/store/useWalletStore';
import { clientChainScopeForTrpc } from '~/utils/walletQuery';
import { Trophy, ExternalLink, Download, RefreshCw } from 'lucide-react';
import { CHAIN_CONFIG } from '~/config/chain';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';
import { useTransactionHistory } from '~/hooks/useTransactionHistory';
import { useMemo, useEffect } from 'react';
import {
  dbActivityPrimaryLine,
  dbActivityTypeLabel,
} from '~/lib/wallet/dbActivityDisplay';

export const Route = createFileRoute('/portfolio/claims/')({
  component: ClaimHistoryPage,
});

function ClaimHistoryPage() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, chainId } = useWallet();
  const chainScope = clientChainScopeForTrpc(chainId);

  const creditsQuery = useTransactionHistory({
    limit: 100,
    offset: 0,
    type: 'credits',
    enabled: isConnected,
  });

  const rows = creditsQuery.data?.transactions ?? [];

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rows],
  );

  const totalCredited = useMemo(() => sorted.reduce((s, tx) => s + (tx.amount || 0), 0), [sorted]);

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.VITE_ACTIVITY_DEBUG !== '1') return;
    console.info('[activity-debug:claims]', {
      source: 'getTransactionHistory',
      typeFilter: 'credits',
      rowCount: sorted.length,
      dataUpdatedAt: creditsQuery.dataUpdatedAt,
    });
  }, [creditsQuery.dataUpdatedAt, sorted.length]);

  const handleExportCSV = () => {
    const csvHeader = 'Date,Type,Primary,Amount,Status,TX Hash,Id\n';
    const csvRows = sorted.map((tx) => {
      const date = new Date(tx.createdAt).toISOString();
      const primary = dbActivityPrimaryLine(tx).replace(/,/g, ';');
      return `${date},${tx.type},${primary},${tx.amount.toFixed(2)},${tx.status},${tx.txHash ?? ''},${tx.id}`;
    }).join('\n');

    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictio-credits-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-syne font-bold text-4xl">Credits & settlements</h1>
              <Link
                to="/portfolio"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                ← Back to Portfolio
              </Link>
            </div>
            <p className="text-gray-400">
              Database-backed credits (market settlements, rewards, LP fee claims). Not browser-local.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => creditsQuery.refetch()}
                disabled={creditsQuery.isFetching}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-white/15 text-gray-200 hover:bg-white/5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${creditsQuery.isFetching ? 'animate-spin' : ''}`} />
                Sync
              </button>
              {import.meta.env.DEV && import.meta.env.VITE_ACTIVITY_DEBUG === '1' ? (
                <span className="text-[10px] font-mono text-amber-200/90">
                  chainScope={chainScope} updatedAt={creditsQuery.dataUpdatedAt || '—'}
                </span>
              ) : null}
            </div>
          </div>

          {!isConnected ? (
            <GuestPageState onConnect={() => requireWallet()} />
          ) : (
            <>
              {sorted.length > 0 && (
                <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Total credited (this page)</div>
                      <div className="font-mono text-3xl font-bold text-brand-green">${totalCredited.toFixed(2)}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {sorted.length} {sorted.length === 1 ? 'row' : 'rows'} (max 100)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                </div>
              )}

              {creditsQuery.isLoading ? (
                <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center text-gray-400">
                  Loading…
                </div>
              ) : creditsQuery.isError ? (
                <div className="p-12 bg-red-500/10 border border-red-500/30 rounded-lg text-center text-red-200 text-sm">
                  Failed to load credits.
                </div>
              ) : sorted.length > 0 ? (
                <div className="space-y-2">
                  {sorted.map((tx) => {
                    const explorerUrl =
                      CHAIN_CONFIG.explorerUrl && tx.txHash ? `${CHAIN_CONFIG.explorerUrl}/tx/${tx.txHash}` : null;

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold mb-0.5">{dbActivityTypeLabel(tx.type)}</div>
                            <div className="text-sm text-gray-300 truncate">{dbActivityPrimaryLine(tx)}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-bold text-lg text-brand-green">+${tx.amount.toFixed(2)}</div>
                            {tx.txHash ? (
                              <div className="text-xs text-gray-500 font-mono">
                                {tx.txHash.slice(0, 8)}…{tx.txHash.slice(-6)}
                              </div>
                            ) : null}
                          </div>

                          {explorerUrl ? (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-white/10 rounded transition-colors"
                              title="View on explorer"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                          ) : null}

                          {tx.marketId ? (
                            <Link
                              to="/markets/$marketId"
                              params={{ marketId: tx.marketId }}
                              className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
                            >
                              Market →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
                  <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="font-syne font-bold text-xl mb-2">No credit rows yet</h3>
                  <p className="text-gray-400 mb-6">
                    Winning settlements and reward claims appear here once written to the ledger.
                  </p>
                  <Link
                    to="/markets"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                  >
                    Browse markets
                  </Link>
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
