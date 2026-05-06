import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { APYTrendChart } from './APYTrendChart';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import type { LPMarket } from '~/data/mockLP';

interface APYChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: LPMarket;
}

export function APYChartModal({ isOpen, onClose, market }: APYChartModalProps) {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  
  const trpc = useTRPC();
  const apyHistoryQuery = useQuery({
    ...trpc.getMarketAPYHistory.queryOptions({
      marketId: market.id,
      timeRange,
    }),
  });

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-250"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-brand-navy border border-brand-green/30 shadow-2xl transition-all">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <Dialog.Title className="font-syne text-2xl font-bold mb-2">
                        APY Performance
                      </Dialog.Title>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="text-xl">{market.sportEmoji}</span>
                        <span>{market.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{market.league}</div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {apyHistoryQuery.isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
                    </div>
                  ) : apyHistoryQuery.error ? (
                    <div className="text-center py-20 text-red-500">
                      Failed to load APY history
                    </div>
                  ) : apyHistoryQuery.data ? (
                    <APYTrendChart
                      data={apyHistoryQuery.data.history}
                      summary={apyHistoryQuery.data.summary}
                      timeRange={timeRange}
                      onTimeRangeChange={setTimeRange}
                      marketName={market.name}
                    />
                  ) : null}

                  {/* Additional Info */}
                  {apyHistoryQuery.data && (
                    <div className="mt-6 p-4 bg-white/5 rounded-lg">
                      <h4 className="font-semibold text-sm mb-3">Market Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400 mb-1">Pool Size</div>
                          <div className="font-mono font-semibold">
                            ${(market.poolSize / 1000).toFixed(1)}K USDC
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">24h Volume</div>
                          <div className="font-mono font-semibold">
                            ${(market.volume24h / 1000).toFixed(1)}K
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">Risk Level</div>
                          <div className="font-semibold capitalize">{market.risk}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">Closes At</div>
                          <div className="font-semibold">
                            {market.closesAt.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
