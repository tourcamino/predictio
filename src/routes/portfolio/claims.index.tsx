import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { useWallet } from '~/store/useWalletStore';
import { Wallet, Trophy, ExternalLink, Download } from 'lucide-react';
import { CHAIN_CONFIG } from '~/config/chain';

export const Route = createFileRoute('/portfolio/claims/')({
  component: ClaimHistoryPage,
});

function ClaimHistoryPage() {
  const { isConnected, openWalletModal, transactions } = useWallet();

  const claimTransactions = transactions
    .filter(tx => tx.type === 'claim')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const totalClaimed = claimTransactions.reduce((sum, tx) => sum + tx.amountUsdc, 0);

  const handleExportCSV = () => {
    const csvHeader = 'Date,Market,Amount,TX Hash\n';
    const csvRows = claimTransactions.map((tx) => {
      const date = new Date(tx.timestamp).toISOString();
      const market = tx.description.replace(/,/g, ';'); // Escape commas
      const amount = tx.amountUsdc.toFixed(2);
      const txHash = tx.txHash || '';
      
      return `${date},${market},${amount},${txHash}`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictio-claims-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                <Wallet className="w-12 h-12 text-gray-500" />
              </div>
            </div>
            
            <h1 className="font-syne font-bold text-4xl mb-4">
              Connect Your Wallet
            </h1>
            
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
              Connect your wallet to view your claim history.
            </p>
            
            <button
              onClick={openWalletModal}
              className="px-8 py-4 bg-brand-green text-brand-bg font-bold text-lg rounded-lg hover:bg-brand-green/90 transition-all shadow-xl shadow-brand-green/20"
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-syne font-bold text-4xl">Claim History</h1>
              <Link
                to="/portfolio"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                ← Back to Portfolio
              </Link>
            </div>
            <p className="text-gray-400">All your claimed winnings</p>
          </div>

          {/* Summary Card */}
          {claimTransactions.length > 0 && (
            <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Claimed</div>
                  <div className="font-mono text-3xl font-bold text-brand-green">
                    ${totalClaimed.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    From {claimTransactions.length} {claimTransactions.length === 1 ? 'claim' : 'claims'}
                  </div>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          )}

          {/* Claims Table */}
          {claimTransactions.length > 0 ? (
            <div className="space-y-2">
              {claimTransactions.map((tx) => {
                const explorerUrl = CHAIN_CONFIG.explorerUrl && tx.txHash
                  ? `${CHAIN_CONFIG.explorerUrl}/tx/${tx.txHash}`
                  : null;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold mb-1">{tx.description}</div>
                        <div className="text-sm text-gray-400">
                          {new Date(tx.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono font-bold text-lg text-brand-green">
                          +${tx.amountUsdc.toFixed(2)}
                        </div>
                        {tx.txHash && (
                          <div className="text-xs text-gray-500">
                            {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                          </div>
                        )}
                      </div>
                      
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                          title="View on explorer"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      )}
                      
                      {tx.marketId && (
                        <Link
                          to="/markets/$marketId"
                          params={{ marketId: tx.marketId }}
                          className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
                        >
                          View Market →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
              <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="font-syne font-bold text-xl mb-2">No Claims Yet</h3>
              <p className="text-gray-400 mb-6">
                Win your first prediction to start claiming rewards!
              </p>
              <Link
                to="/markets"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
              >
                Browse Markets
              </Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
