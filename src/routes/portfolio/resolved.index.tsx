import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { useWallet } from '~/store/useWalletStore';
import { Trophy, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';

export const Route = createFileRoute('/portfolio/resolved/')({
  component: ResolvedMarketsPage,
});

function ResolvedMarketsPage() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, resolvedMarkets, claimWinnings, batchClaimWinnings, balanceEth } = useWallet();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [batchClaiming, setBatchClaiming] = useState(false);

  const claimableMarkets = resolvedMarkets.filter(m => m.claimStatus === 'claimable' && m.won);
  const totalClaimable = claimableMarkets.reduce((sum, m) => sum + m.claimableAmount, 0);

  const handleClaim = async (marketId: string) => {
    setClaimingId(marketId);
    try {
      const result = await toast.promise(
        claimWinnings(marketId),
        {
          loading: 'Claiming winnings...',
          success: (data) => `✓ Claimed $${data.amount.toFixed(2)}!`,
          error: 'Failed to claim',
        }
      );
    } catch (error: any) {
      console.error('Claim failed:', error);
    } finally {
      setClaimingId(null);
    }
  };

  const handleBatchClaim = async () => {
    if (claimableMarkets.length === 0) return;
    
    setBatchClaiming(true);
    const marketIds = claimableMarkets.map(m => m.marketId);
    
    try {
      const result = await toast.promise(
        batchClaimWinnings(marketIds),
        {
          loading: `Claiming ${claimableMarkets.length} markets...`,
          success: (data) => `✓ Claimed $${data.amount.toFixed(2)} from ${claimableMarkets.length} markets!`,
          error: 'Failed to batch claim',
        }
      );
      
      // Confetti animation (subtle)
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        // Only on desktop for performance
        console.log('🎉 Claim successful!');
      }
    } catch (error: any) {
      console.error('Batch claim failed:', error);
    } finally {
      setBatchClaiming(false);
    }
  };

  const hasLowGas = isConnected && balanceEth < 0.001;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-syne font-bold text-4xl">Ready to Claim</h1>
              <Link
                to="/portfolio"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                ← Back to Portfolio
              </Link>
            </div>
            <p className="text-gray-400">
              {claimableMarkets.length} {claimableMarkets.length === 1 ? 'market' : 'markets'} · ${totalClaimable.toFixed(2)} total
            </p>
          </div>

          {!isConnected ? (
            <GuestPageState onConnect={() => requireWallet()} />
          ) : (
          <>
          {/* Low Gas Warning */}
          {hasLowGas && claimableMarkets.length > 0 && (
            <div className="mb-6 flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-500">
                <div className="font-semibold mb-1">Low ETH balance</div>
                <div>You need ETH to pay gas fees for claiming. <Link to="/wallet/deposit" className="underline">Top up ETH →</Link></div>
              </div>
            </div>
          )}

          {/* Batch Claim Button */}
          {claimableMarkets.length > 1 && (
            <div className="mb-6 p-6 bg-brand-green/10 border border-brand-green/30 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-syne font-bold text-xl mb-1">Claim All</h3>
                  <p className="text-sm text-gray-400">
                    Save on gas by claiming all markets in a single transaction
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-brand-green">
                    ${totalClaimable.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Gas: ~$1.20
                  </div>
                </div>
              </div>
              <button
                onClick={handleBatchClaim}
                disabled={batchClaiming || hasLowGas}
                className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchClaiming ? 'Claiming...' : `Claim All ($${totalClaimable.toFixed(2)})`}
              </button>
            </div>
          )}

          {/* Claimable Markets List */}
          {claimableMarkets.length > 0 ? (
            <div className="space-y-4">
              {claimableMarkets.map((market) => {
                const isClaiming = claimingId === market.marketId;
                const timeSinceResolved = market.resolvedAt
                  ? Math.floor((Date.now() - market.resolvedAt.getTime()) / (1000 * 60 * 60))
                  : null;
                
                return (
                  <div
                    key={market.marketId}
                    className="p-6 bg-white/5 border border-brand-green/30 rounded-lg hover:border-brand-green/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-5 h-5 text-brand-green" />
                          <h3 className="font-syne font-semibold text-lg">{market.marketName}</h3>
                        </div>
                        <div className="text-sm text-gray-400 mb-1">
                          Outcome: <span className="text-white">{market.outcome}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Your position: <span className="text-brand-green">{market.userOutcome}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          Resolved{' '}
                          {timeSinceResolved === null
                            ? 'recently'
                            : timeSinceResolved < 1
                              ? 'just now'
                              : `${timeSinceResolved}h ago`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-2xl font-bold text-brand-green mb-1">
                          ${market.claimableAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {market.claimableAmount.toFixed(2)} shares × $1.00
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaim(market.marketId)}
                      disabled={isClaiming || hasLowGas}
                      className="w-full py-3 bg-brand-green/20 text-brand-green border border-brand-green/30 font-semibold rounded-lg hover:bg-brand-green/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isClaiming ? 'Claiming...' : `Claim $${market.claimableAmount.toFixed(2)}`}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
              <CheckCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="font-syne font-bold text-xl mb-2">All Caught Up!</h3>
              <p className="text-gray-400 mb-6">
                You don't have any markets ready to claim right now.
              </p>
              <Link
                to="/markets"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
              >
                Browse Markets
              </Link>
            </div>
          )}

          {/* Claimed Markets (for reference) */}
          {resolvedMarkets.some(m => m.claimStatus === 'claimed') && (
            <div className="mt-12">
              <h2 className="font-syne font-bold text-2xl mb-4">Recently Claimed</h2>
              <div className="space-y-2">
                {resolvedMarkets
                  .filter(m => m.claimStatus === 'claimed')
                  .slice(0, 5)
                  .map((market) => (
                    <div
                      key={market.marketId}
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg"
                    >
                      <div>
                        <div className="font-semibold mb-1">{market.marketName}</div>
                        <div className="text-sm text-gray-400">{market.outcome}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-semibold text-brand-green">
                          +${market.claimableAmount.toFixed(2)}
                        </div>
                        <CheckCircle className="w-4 h-4 text-brand-green" />
                      </div>
                    </div>
                  ))}
              </div>
              <Link
                to="/portfolio/claims"
                className="block mt-4 text-center text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                View all claims →
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

