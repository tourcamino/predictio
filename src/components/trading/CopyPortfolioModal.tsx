import { Fragment, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, TrendingUp, Target, Award, AlertTriangle, Copy, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPCClient } from '~/trpc/react';
import { useUserPositions } from '~/hooks/useUserPositions';
import { useMarketSummaries } from '~/hooks/useMarketSummaries';
import {
  executeStartCopyTradingWithExpress,
  executeStopCopyTradingWithExpress,
} from '~/lib/executeCopyTradingWithExpress';
import { useWallet } from '~/store/useWalletStore';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import toast from 'react-hot-toast';
import { MarketSelectionUI } from './MarketSelectionUI';
import {
  formatRoiPct,
  formatWinRatePct,
  roiTextClass,
  shortenWallet,
} from "~/utils/formatCopyTrading";
import { normalizeWalletForQuery } from "~/utils/walletQuery";

interface CopyPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyst: {
    id: string;
    wallet: string;
    displayName: string;
    avatar: string;
    roi: number;
    winRate: number;
    totalPredictions: number;
    sport: string[];
  };
  existingCopy?: {
    id: string;
    maxPerTradeUsd: number;
    copyMode: string;
    selectedMarkets: string[];
    totalVolumeCopied: number;
  } | null;
}

export function CopyPortfolioModal({ 
  isOpen, 
  onClose, 
  analyst,
  existingCopy 
}: CopyPortfolioModalProps) {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { cashUsdc: paperCash } = usePaperWalletBalance();
  const { requireWalletAndChain, showGateModal, closeGateModal } = useWalletGate();
  
  const [maxPerTrade, setMaxPerTrade] = useState(existingCopy?.maxPerTradeUsd.toString() || '50');
  const [copyMode, setCopyMode] = useState<'all' | 'selective'>(
    (existingCopy?.copyMode as 'all' | 'selective') || 'all'
  );
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(
    existingCopy?.selectedMarkets || []
  );

  const analystPositionsQuery = useUserPositions({
    walletAddress: normalizeWalletForQuery(analyst.wallet),
    status: 'open',
    enabled: isOpen && copyMode === 'selective',
  });

  const analystMarketIds = useMemo(() => {
    const rows = analystPositionsQuery.data?.positions ?? [];
    return [...new Set(rows.map((p) => p.marketId))];
  }, [analystPositionsQuery.data?.positions]);

  const analystSummariesQuery = useMarketSummaries({
    marketIds: analystMarketIds,
    enabled: isOpen && copyMode === 'selective' && analystMarketIds.length > 0,
    staleTime: 30_000,
  });

  const analystMarketById = analystSummariesQuery.data ?? {};

  // Transform analyst positions into markets for selection
  const availableMarkets = (analystPositionsQuery.data?.positions || [])
    .map(position => {
      const market = analystMarketById[position.marketId];
      if (!market) return null;
      
      return {
        id: market.id,
        event:
          (position as { market?: { event?: string } }).market?.event ??
          `${market.teamA} vs ${market.teamB}`,
        sport: market.sport,
        sportEmoji: market.sportEmoji,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        analystVolume: position.amount,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const analystSportAllowlist = useMemo(
    () => new Set(analyst.sport.map((s) => s.trim().toLowerCase())),
    [analyst.sport],
  );

  /** Selective copy: only markets whose sport matches the analyst profile (e.g. football-only personas). */
  const marketsMatchingAnalystSports = useMemo(() => {
    return availableMarkets.filter((m) =>
      analystSportAllowlist.has((m.sport || "").trim().toLowerCase()),
    );
  }, [availableMarkets, analystSportAllowlist]);

  const startCopyMutation = useMutation({
    mutationFn: (payload: {
      copierWallet: string;
      analystWallet: string;
      maxPerTradeUsd: number;
      copyMode: 'all' | 'selective';
      selectedMarkets: string[];
    }) =>
      executeStartCopyTradingWithExpress(
        (input) => trpcClient.startCopyTrading.mutate(input),
        payload,
      ),
    onSuccess: () => {
      toast.success(`Now copying ${analyst.displayName}'s trades!`);
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start copy trading');
    },
  });

  const stopCopyMutation = useMutation({
    mutationFn: (payload: { copierWallet: string; analystWallet: string }) =>
      executeStopCopyTradingWithExpress(
        (input) => trpcClient.stopCopyTrading.mutate(input),
        payload,
      ),
    onSuccess: () => {
      toast.success(`Stopped copying ${analyst.displayName}`);
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop copy trading');
    },
  });

  const handleStartCopy = () => {
    if (!requireWalletAndChain()) return;
    if (!address) return;
    const amount = parseFloat(maxPerTrade);
    if (isNaN(amount) || amount < 10) {
      toast.error('Minimum copy amount is $10');
      return;
    }

    if (amount > paperCash) {
      toast.error('Amount exceeds your balance');
      return;
    }

    if (copyMode === 'selective' && selectedMarkets.length === 0) {
      toast.error('Please select at least 1 market to copy');
      return;
    }

    startCopyMutation.mutate({
      analystWallet: analyst.wallet,
      copierWallet: address,
      maxPerTradeUsd: amount,
      copyMode,
      selectedMarkets: copyMode === 'selective' ? selectedMarkets : [],
    });
  };

  const handleStopCopy = () => {
    if (!address || !existingCopy) return;

    stopCopyMutation.mutate({
      copierWallet: address,
      analystWallet: analyst.wallet,
    });
  };

  const isPending = startCopyMutation.isPending || stopCopyMutation.isPending;

  return (
    <>
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-5">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="flex max-h-[min(88vh,720px)] w-full max-w-lg transform flex-col overflow-hidden rounded-xl border border-brand-green/30 bg-brand-navy shadow-2xl transition-all">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-5">
                  <Dialog.Title className="flex items-center gap-2 font-syne text-lg font-bold sm:text-xl">
                    <Copy className="h-5 w-5 shrink-0 text-brand-green" />
                    <span className="min-w-0 truncate">
                      {existingCopy ? "Manage Copy Trading" : "Copy Portfolio"}
                    </span>
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6">
                  {/* Analyst Info */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
                        {analyst.avatar}
                      </div>
                      <div>
                        <div className="font-bold">{analyst.displayName}</div>
                        <div
                          className="truncate font-mono text-xs text-gray-400"
                          title={analyst.wallet}
                        >
                          {shortenWallet(analyst.wallet, 6, 4)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="min-w-0 rounded bg-white/5 p-2">
                        <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-400 sm:text-xs">
                          <TrendingUp className="h-3 w-3 shrink-0" />
                          <span className="truncate">ROI</span>
                        </div>
                        <div
                          className={`truncate font-mono text-sm font-bold ${roiTextClass(analyst.roi)}`}
                        >
                          {formatRoiPct(analyst.roi)}
                        </div>
                      </div>
                      <div className="min-w-0 rounded bg-white/5 p-2">
                        <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-400 sm:text-xs">
                          <Target className="h-3 w-3 shrink-0" />
                          <span className="truncate">Win</span>
                        </div>
                        <div className="truncate font-mono text-sm font-bold text-brand-cyan">
                          {formatWinRatePct(analyst.winRate)}
                        </div>
                      </div>
                      <div className="min-w-0 rounded bg-white/5 p-2">
                        <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-400 sm:text-xs">
                          <Award className="h-3 w-3 shrink-0" />
                          <span className="truncate">Trades</span>
                        </div>
                        <div className="truncate font-mono text-sm font-bold">
                          {analyst.totalPredictions}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Existing Copy Stats */}
                  {existingCopy && (
                    <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-brand-green" />
                        <span className="font-semibold text-brand-green">Currently Copying</span>
                      </div>
                      <div className="text-sm text-gray-300">
                        Total volume copied: <span className="font-mono font-bold">${existingCopy.totalVolumeCopied.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Max Per Trade Input */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Max Amount Per Trade
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={maxPerTrade}
                        onChange={(e) => setMaxPerTrade(e.target.value)}
                        min="10"
                        max={paperCash}
                        step="10"
                        className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono"
                        placeholder="50"
                        disabled={isPending}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Each copied trade will use up to this amount. Min: $10, Max: ${paperCash.toFixed(2)}
                    </p>
                  </div>

                  {/* Copy Mode */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Copy Mode
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="radio"
                          name="copyMode"
                          value="all"
                          checked={copyMode === 'all'}
                          onChange={() => setCopyMode('all')}
                          className="mt-1"
                          disabled={isPending}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">Copy All Trades</div>
                          <div className="text-xs text-gray-400">
                            Automatically copy every trade this analyst makes
                          </div>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="radio"
                          name="copyMode"
                          value="selective"
                          checked={copyMode === 'selective'}
                          onChange={() => setCopyMode('selective')}
                          className="mt-1"
                          disabled={isPending}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">Select Specific Markets</div>
                          <div className="text-xs text-gray-400">
                            {copyMode === 'selective' && selectedMarkets.length > 0
                              ? `${selectedMarkets.length} market${selectedMarkets.length !== 1 ? 's' : ''} selected`
                              : 'Choose which markets to copy'}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Market Selection UI */}
                  {copyMode === 'selective' && (
                    <div className="border-t border-white/10 pt-4">
                      <h3 className="mb-1 text-sm font-semibold">Select markets to copy</h3>
                      <p className="mb-3 text-xs text-gray-500">
                        Only markets in this analyst&apos;s sports ({analyst.sport.join(", ")}) are shown.
                      </p>
                      
                      {analystPositionsQuery.isLoading ? (
                        <div className="p-6 text-center">
                          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
                          <p className="text-sm text-gray-400">Loading analyst&apos;s markets...</p>
                        </div>
                      ) : availableMarkets.length === 0 ? (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                          <p className="mb-2 text-sm text-gray-400">
                            This analyst has no open positions yet
                          </p>
                          <p className="text-xs text-gray-500">
                            Switch to &quot;Copy All Trades&quot; to start copying when they place new trades
                          </p>
                        </div>
                      ) : marketsMatchingAnalystSports.length === 0 ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                          <p className="mb-2 text-sm text-amber-100">
                            No open positions in {analyst.sport.join(" / ")} right now
                          </p>
                          <p className="text-xs text-gray-400">
                            Use &quot;Copy All Trades&quot; to mirror their next tickets, or check back when they open a line in their sports.
                          </p>
                        </div>
                      ) : (
                        <MarketSelectionUI
                          markets={marketsMatchingAnalystSports}
                          initialSelected={selectedMarkets}
                          onSelectionChange={setSelectedMarkets}
                        />
                      )}
                    </div>
                  )}

                  {/* Risk Warning */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm space-y-2">
                        <p className="font-semibold text-yellow-300">Important Information</p>
                        <ul className="text-gray-300 space-y-1 list-disc list-inside">
                          <li>Copy trading involves risk. Past performance doesn't guarantee future results.</li>
                          <li>You'll pay a 1% trading fee on each copied trade.</li>
                          <li>The analyst earns 35% of your trading fees.</li>
                          <li>You can stop copying at any time.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {existingCopy ? (
                      <>
                        <button
                          onClick={handleStartCopy}
                          disabled={isPending}
                          className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? 'Updating...' : 'Update Settings'}
                        </button>
                        <button
                          onClick={handleStopCopy}
                          disabled={isPending}
                          className="flex-1 py-3 bg-red-500/20 border border-red-500/50 text-red-500 font-bold rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? 'Stopping...' : 'Stop Copying'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={onClose}
                          disabled={isPending}
                          className="flex-1 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleStartCopy}
                          disabled={isPending}
                          className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? 'Starting...' : 'Start Copying'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>

      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </>
  );
}
