import { createFileRoute } from '@tanstack/react-router';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useState } from 'react';
import { mockMarkets } from '~/data/mockMarkets';
import { mockDisputedMarkets } from '~/data/mockAdmin';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/admin/resolve/')({
  component: ResolveMarkets,
});

type TabType = 'needs-resolution' | 'resolving' | 'completed';

function ResolveMarkets() {
  const [activeTab, setActiveTab] = useState<TabType>('needs-resolution');
  const [selectedOutcome, setSelectedOutcome] = useState<{ marketId: string; outcome: string } | null>(null);
  const [resolutionSource, setResolutionSource] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [disputedMarkets, setDisputedMarkets] = useState(mockDisputedMarkets);
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [disputeReasons, setDisputeReasons] = useState<Record<string, string>>({});

  // Mock markets that need resolution (ended recently)
  const needsResolution = mockMarkets.slice(0, 3);

  const handleResolve = (marketId: string, outcome: string) => {
    setSelectedOutcome({ marketId, outcome });
  };

  const confirmResolution = () => {
    if (!selectedOutcome) return;
    
    setShowConfirmModal(true);
  };

  const finalizeResolution = () => {
    toast.success('✅ Market resolved · 823 wallets paid · $33,900 USDC distributed');
    setShowConfirmModal(false);
    setSelectedOutcome(null);
    setResolutionSource('');
  };

  const handleSignDispute = (marketId: string, admin: 'admin1' | 'admin2' | 'admin3') => {
    setDisputedMarkets(prev =>
      prev.map(m =>
        m.id === marketId
          ? { ...m, signatures: { ...m.signatures, [admin]: !m.signatures[admin] } }
          : m
      )
    );
  };

  const handleResolveDispute = (marketId: string, outcome: 'YES' | 'NO' | 'VOID') => {
    const market = disputedMarkets.find(m => m.id === marketId);
    const signatureCount = market ? Object.values(market.signatures).filter(Boolean).length : 0;
    
    if (signatureCount < 2) {
      toast.error('⚠️ Need at least 2/3 admin signatures to resolve');
      return;
    }
    
    toast.success(`✅ Market ${outcome === 'VOID' ? 'voided' : `resolved as ${outcome}`} · Payouts processing`);
    setDisputedMarkets(prev => prev.filter(m => m.id !== marketId));
  };

  const reasonOptions = [
    'Match suspended',
    'Match cancelled',
    'Oracle timeout',
    'Ambiguous outcome',
    'Data feed error',
    'Fraud detected',
    'Other',
  ];

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Resolve Markets" breadcrumbs={['Markets']} />
      
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-syne font-bold mb-2">Markets Pending Resolution</h1>
          <p className="text-gray-400">Events that have ended and need outcome confirmation</p>
        </div>

        {/* Auto-resolution Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <div className="text-blue-400 text-xl">🤖</div>
          <div className="flex-1">
            <div className="font-medium text-blue-400 mb-1">Azuro Oracle Status</div>
            <p className="text-sm text-gray-300">
              9 markets resolving automatically · Last sync: 2 min ago · Next sync: 3 min
            </p>
          </div>
        </div>

        {/* Disputed Markets Section */}
        {disputedMarkets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-syne font-bold">Disputed Markets ({disputedMarkets.length})</h2>
              <span className="text-sm text-gray-400">Requires 2/3 admin signatures</span>
            </div>

            {disputedMarkets.map((market) => {
              const signatureCount = Object.values(market.signatures).filter(Boolean).length;
              
              return (
                <div
                  key={market.id}
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 space-y-4"
                >
                  {/* Header */}
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-syne font-bold text-lg mb-1">{market.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-400 font-mono">
                          <span className="text-yellow-500">Status: Under Review</span>
                          <span>·</span>
                          <span>Since: {market.since}</span>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-500 text-sm font-mono">
                        {signatureCount}/3 signed
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 font-mono">
                      <span>Traders affected: {market.tradersAffected}</span>
                      <span>·</span>
                      <span>Volume: ${market.volume.toLocaleString()}</span>
                      <span>·</span>
                      <span>Oracle: {market.oracleStatus}</span>
                    </div>
                  </div>

                  {/* Reason & Notes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Reason filed:
                      </label>
                      <select
                        value={disputeReasons[market.id] || market.reason}
                        onChange={(e) =>
                          setDisputeReasons({ ...disputeReasons, [market.id]: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green"
                      >
                        {reasonOptions.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Admin note:
                      </label>
                      <input
                        type="text"
                        value={disputeNotes[market.id] || ''}
                        onChange={(e) =>
                          setDisputeNotes({ ...disputeNotes, [market.id]: e.target.value })
                        }
                        placeholder="Optional internal note..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-green"
                      />
                    </div>
                  </div>

                  {/* Resolution Actions */}
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-3">Resolution:</div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResolveDispute(market.id, 'YES')}
                        className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                      >
                        Resolve YES
                      </button>
                      <button
                        onClick={() => handleResolveDispute(market.id, 'NO')}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                      >
                        Resolve NO
                      </button>
                      <button
                        onClick={() => handleResolveDispute(market.id, 'VOID')}
                        className="px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-500/30 transition-colors"
                      >
                        Void market
                      </button>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="pt-4 border-t border-yellow-500/20">
                    <div className="text-sm font-medium text-gray-300 mb-3">
                      Requires: 2/3 admin signatures
                    </div>
                    <div className="flex gap-4">
                      {(['admin1', 'admin2', 'admin3'] as const).map((admin) => (
                        <button
                          key={admin}
                          onClick={() => handleSignDispute(market.id, admin)}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                            ${
                              market.signatures[admin]
                                ? 'bg-green-500/20 border-green-500/30 text-green-500'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                            }
                          `}
                        >
                          {market.signatures[admin] ? '✓' : '✗'} {admin}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('needs-resolution')}
            className={`
              px-4 py-2 font-medium transition-colors relative
              ${activeTab === 'needs-resolution'
                ? 'text-brand-green'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Needs Resolution (12)
            {activeTab === 'needs-resolution' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('resolving')}
            className={`
              px-4 py-2 font-medium transition-colors relative
              ${activeTab === 'resolving'
                ? 'text-brand-green'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Resolving (3)
            {activeTab === 'resolving' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`
              px-4 py-2 font-medium transition-colors relative
              ${activeTab === 'completed'
                ? 'text-brand-green'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Completed Today (47)
            {activeTab === 'completed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
            )}
          </button>
        </div>

        {/* Markets List */}
        <div className="space-y-4">
          {needsResolution.map((market, index) => (
            <div
              key={market.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4"
            >
              {/* Market Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{market.sportEmoji}</span>
                    <div>
                      <div className="font-syne font-bold text-lg">
                        #{1040 + index} {market.league} · {market.teamA} vs {market.teamB}
                      </div>
                      <div className="text-sm text-gray-400 font-mono">
                        Event ended: Apr 12, 2025 · 23:47 UTC (2h ago)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 font-mono">
                    Volume: ${market.volume.toLocaleString()} USDC · {(market.predictions ?? 0).toLocaleString()} predictions
                  </div>
                </div>
              </div>

              {/* Outcome Selection */}
              <div>
                <div className="text-sm font-medium text-gray-300 mb-3">SELECT WINNER:</div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleResolve(market.id, market.teamA)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${selectedOutcome?.marketId === market.id && selectedOutcome?.outcome === market.teamA
                        ? 'border-brand-green bg-brand-green/10'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                      }
                    `}
                  >
                    <div className="font-syne font-bold mb-2">{market.teamA}</div>
                    <div className="text-sm text-gray-400 font-mono">
                      ${(market.volume * ((market.percentA ?? 0) / 100)).toLocaleString()} vol
                    </div>
                  </button>
                  <button
                    onClick={() => handleResolve(market.id, market.teamB)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${selectedOutcome?.marketId === market.id && selectedOutcome?.outcome === market.teamB
                        ? 'border-brand-green bg-brand-green/10'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                      }
                    `}
                  >
                    <div className="font-syne font-bold mb-2">{market.teamB}</div>
                    <div className="text-sm text-gray-400 font-mono">
                      ${(market.volume * ((market.percentB ?? 0) / 100)).toLocaleString()} vol
                    </div>
                  </button>
                </div>
              </div>

              {/* Source Confirmation */}
              {selectedOutcome?.marketId === market.id && (
                <div className="animate-slide-down">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Source confirmation:
                  </label>
                  <input
                    type="url"
                    placeholder="Link to official result..."
                    value={resolutionSource}
                    onChange={(e) => setResolutionSource(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-green transition-colors mb-4"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                  Cancel Market
                </button>
                <button
                  onClick={confirmResolution}
                  disabled={!selectedOutcome || selectedOutcome.marketId !== market.id}
                  className="px-6 py-2.5 bg-brand-green hover:bg-brand-green/90 disabled:bg-white/5 disabled:text-gray-500 text-black rounded-lg font-medium transition-colors"
                >
                  Confirm Resolution →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedOutcome && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-bg border border-white/10 rounded-xl max-w-md w-full p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-syne font-bold">Confirm Resolution</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Market:</span>
                <span className="font-mono">UFC 310</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Winner:</span>
                <span className="font-mono font-bold text-brand-green">{selectedOutcome.outcome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Predictions:</span>
                <span className="font-mono">1,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Winners:</span>
                <span className="font-mono">823</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distribution:</span>
                <span className="font-mono">$33,900 USDC</span>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">
                <strong>This action is IRREVERSIBLE.</strong> Once confirmed, payouts will be processed immediately and cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={finalizeResolution}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors animate-pulse"
              >
                Resolve & Pay Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
