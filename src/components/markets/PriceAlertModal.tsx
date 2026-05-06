import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import toast from 'react-hot-toast';
import type { Market } from '~/data/mockMarkets';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  walletAddress: string;
}

const alertSchema = z.object({
  outcome: z.enum(['YES', 'NO']),
  targetPrice: z.number().min(0.01).max(0.99),
  direction: z.enum(['ABOVE', 'BELOW']),
});

type AlertFormData = z.infer<typeof alertSchema>;

export function PriceAlertModal({ isOpen, onClose, market, walletAddress }: PriceAlertModalProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      outcome: 'YES',
      targetPrice: 0.70,
      direction: 'ABOVE',
    },
  });

  const createAlertMutation = useMutation(
    trpc.createPriceAlert.mutationOptions({
      onSuccess: () => {
        toast.success('Price alert created!');
        queryClient.invalidateQueries({
          queryKey: trpc.getPriceAlerts.queryKey({ walletAddress }),
        });
        onClose();
        form.reset();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create price alert');
      },
    })
  );

  const onSubmit = (data: AlertFormData) => {
    createAlertMutation.mutate({
      walletAddress,
      marketId: market.id,
      ...data,
    });
  };

  const targetPrice = form.watch('targetPrice');
  const direction = form.watch('direction');
  const currentPrice = selectedOutcome === 'YES' ? market.yesPrice : market.noPrice;

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-brand-navy border border-brand-green/30 shadow-2xl transition-all">
                <div className="relative p-6">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                      <Bell className="w-6 h-6 text-brand-cyan" />
                    </div>
                    <div>
                      <Dialog.Title className="font-syne text-2xl font-bold">
                        Set Price Alert
                      </Dialog.Title>
                      <p className="text-sm text-gray-400">Get notified when price reaches target</p>
                    </div>
                  </div>

                  {/* Market Info */}
                  <div className="mb-6 p-4 bg-white/5 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Market</div>
                    <div className="font-semibold">{market.teamA} vs {market.teamB}</div>
                    <div className="text-xs text-gray-500 mt-1">{market.league}</div>
                  </div>

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Outcome Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Select Outcome
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOutcome('YES');
                            form.setValue('outcome', 'YES');
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedOutcome === 'YES'
                              ? 'border-green-500 bg-green-500/20'
                              : 'border-white/10 bg-white/5 hover:border-green-500/50'
                          }`}
                        >
                          <div className="font-bold text-lg text-green-500">YES</div>
                          <div className="font-mono text-2xl text-green-500 font-bold mt-1">
                            ${market.yesPrice.toFixed(2)}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOutcome('NO');
                            form.setValue('outcome', 'NO');
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedOutcome === 'NO'
                              ? 'border-red-500 bg-red-500/20'
                              : 'border-white/10 bg-white/5 hover:border-red-500/50'
                          }`}
                        >
                          <div className="font-bold text-lg text-red-500">NO</div>
                          <div className="font-mono text-2xl text-red-500 font-bold mt-1">
                            ${market.noPrice.toFixed(2)}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Direction Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Alert When Price Goes
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => form.setValue('direction', 'ABOVE')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            direction === 'ABOVE'
                              ? 'border-brand-green bg-brand-green/20'
                              : 'border-white/10 bg-white/5 hover:border-brand-green/50'
                          }`}
                        >
                          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-brand-green" />
                          <div className="font-semibold">Above</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => form.setValue('direction', 'BELOW')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            direction === 'BELOW'
                              ? 'border-orange-500 bg-orange-500/20'
                              : 'border-white/10 bg-white/5 hover:border-orange-500/50'
                          }`}
                        >
                          <TrendingDown className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                          <div className="font-semibold">Below</div>
                        </button>
                      </div>
                    </div>

                    {/* Target Price Input */}
                    <div>
                      <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-300 mb-2">
                        Target Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          $
                        </span>
                        <input
                          id="targetPrice"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="0.99"
                          {...form.register('targetPrice', { valueAsNumber: true })}
                          className="w-full pl-8 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                          placeholder="0.70"
                        />
                      </div>
                      {form.formState.errors.targetPrice && (
                        <p className="mt-1 text-sm text-red-500">
                          {form.formState.errors.targetPrice.message}
                        </p>
                      )}

                      {/* Price Comparison */}
                      <div className="mt-3 p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Current Price:</span>
                          <span className="font-mono font-semibold">${currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-gray-400">Target Price:</span>
                          <span className="font-mono font-semibold">${targetPrice.toFixed(2)}</span>
                        </div>
                        {targetPrice && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <div className={`text-sm font-semibold ${
                              direction === 'ABOVE'
                                ? targetPrice > currentPrice ? 'text-brand-green' : 'text-orange-500'
                                : targetPrice < currentPrice ? 'text-brand-green' : 'text-orange-500'
                            }`}>
                              {direction === 'ABOVE' ? (
                                targetPrice > currentPrice ? (
                                  `✓ Alert will trigger when price rises to $${targetPrice.toFixed(2)}`
                                ) : (
                                  `⚠ Target is below current price. Alert will trigger immediately.`
                                )
                              ) : (
                                targetPrice < currentPrice ? (
                                  `✓ Alert will trigger when price drops to $${targetPrice.toFixed(2)}`
                                ) : (
                                  `⚠ Target is above current price. Alert will trigger immediately.`
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={createAlertMutation.isPending}
                      className="w-full py-3 bg-brand-cyan text-brand-bg font-bold text-lg rounded-lg hover:bg-brand-cyan/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createAlertMutation.isPending ? 'Creating Alert...' : 'Create Price Alert'}
                    </button>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
