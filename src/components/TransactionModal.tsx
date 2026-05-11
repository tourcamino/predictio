import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, Check, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import { ShareButton } from './ShareButton';
import { generatePredictionShareText } from '~/utils/shareUtils';
import { FeeBreakdownCard } from './FeeBreakdownCard';

type TransactionState = 'review' | 'pending' | 'mining' | 'success' | 'error';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TransactionState;
  type: 'bet' | 'deposit' | 'withdraw' | 'cashout';
  marketName?: string;
  marketId?: string;
  outcome?: string;
  amount?: number;
  potentialWin?: number;
  fee?: number;
  netProfit?: number;
  txHash?: string;
  error?: string;
  onConfirm?: () => void;
  onRetry?: () => void;
  sportEmoji?: string;
  league?: string;
  teamA?: string;
  teamB?: string;
  odds?: number;
  children?: React.ReactNode;
}

export function TransactionModal({
  isOpen,
  onClose,
  state,
  type,
  marketName,
  marketId,
  outcome,
  amount = 0,
  potentialWin = 0,
  fee = 0,
  netProfit = 0,
  txHash,
  error,
  onConfirm,
  onRetry,
  sportEmoji = '⚽',
  league = '',
  teamA = '',
  teamB = '',
  odds = 0,
  children,
}: TransactionModalProps) {
  const getTitle = () => {
    switch (state) {
      case 'review':
        return type === 'bet' ? 'Confirm Prediction' : `Confirm ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      case 'pending':
        return 'Waiting for Approval';
      case 'mining':
        return 'Transaction Submitted';
      case 'success':
        return type === 'bet' ? 'Prediction Placed! 🎉' : 'Transaction Complete! ✓';
      case 'error':
        return 'Transaction Failed';
      default:
        return '';
    }
  };

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
          <div className="flex min-h-full items-center justify-center p-0 sm:p-2">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-250"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full h-full sm:h-auto sm:max-w-[14rem] transform overflow-hidden sm:rounded-xl bg-brand-navy border-0 sm:border border-brand-green/30 shadow-2xl transition-all">
                {/* Close button */}
                {state !== 'pending' && state !== 'mining' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="p-3">
                  <Dialog.Title className="font-syne text-lg font-bold mb-3 text-center">
                    {getTitle()}
                  </Dialog.Title>

                  {/* Review State */}
                  {state === 'review' && (
                    <>
                      {(type === 'deposit' || type === 'withdraw') && children ? (
                        children
                      ) : type === 'bet' ? (
                    <div className="space-y-2">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <p className="text-[0.65rem] text-gray-400 mb-1">Market</p>
                        <p className="font-semibold text-sm">{marketName}</p>
                      </div>

                      <div className="p-2 bg-white/5 rounded-lg">
                        <p className="text-[0.65rem] text-gray-400 mb-1">Your Prediction</p>
                        <p className="font-syne text-sm font-bold text-brand-green">{outcome}</p>
                      </div>

                      {/* Enhanced profit display with ROI */}
                      <div className="p-2 bg-gradient-to-br from-brand-green/20 to-brand-green/5 border-2 border-brand-green/40 rounded-lg">
                        <div className="text-center mb-2">
                          <div className="text-[0.6rem] text-gray-400 mb-1">If you win</div>
                          <div className="text-xl font-bold text-brand-green">
                            ${potentialWin.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center text-xs text-gray-400 mb-3">
                          Deposit <span className="font-semibold text-white">${amount.toFixed(2)}</span> → Win <span className="font-semibold text-brand-green">${potentialWin.toFixed(2)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                          <div className="text-center">
                            <div className="text-[0.65rem] text-gray-400 mb-1">Net Profit</div>
                            <div className="text-sm font-bold text-brand-green">
                              +${netProfit.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[0.65rem] text-gray-400 mb-1">ROI</div>
                            <div className="text-sm font-bold text-brand-green">
                              +{((netProfit / amount) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 bg-white/5 rounded-lg space-y-1.5 font-mono text-[0.65rem]">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Your stake:</span>
                          <span className="font-bold">${amount.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fee (0.8%):</span>
                          <span>~${fee.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Odds:</span>
                          <span className="font-semibold">{odds.toFixed(2)}x</span>
                        </div>
                      </div>

                      {/* Fee Distribution Breakdown */}
                      {fee > 0 && (
                        <FeeBreakdownCard 
                          feeAmount={fee}
                          variant="compact"
                        />
                      )}

                      <div className="flex items-center gap-2 text-[0.65rem] text-gray-400 p-2 bg-white/5 rounded">
                        <Zap className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
                        <div>
                          <p>Transaction on BASE</p>
                          <p>Estimated gas: ~$0.001</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-1.5 border border-white/20 rounded-lg hover:bg-white/5 transition-colors font-semibold text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={onConfirm}
                          className="flex-1 py-1.5 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors text-xs"
                        >
                          Confirm & Predict
                        </button>
                      </div>
                    </div>
                      ) : null}
                    </>
                  )}

                  {/* Pending State */}
                  {state === 'pending' && (
                    <div className="text-center py-8">
                      <div className="mb-6 flex justify-center">
                        <Loader2 className="w-16 h-16 text-brand-green animate-spin" />
                      </div>
                      <p className="text-gray-400 mb-4">Waiting for wallet approval...</p>
                      <p className="text-sm text-gray-500">Check your wallet to approve this transaction</p>
                    </div>
                  )}

                  {/* Mining State */}
                  {state === 'mining' && (
                    <div className="text-center py-8">
                      <div className="mb-6 flex justify-center">
                        <Loader2 className="w-16 h-16 text-brand-green animate-spin" />
                      </div>
                      <p className="text-gray-400 mb-4">Transaction submitted</p>
                      {txHash && (
                        <a
                          href={`https://basescan.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-brand-green hover:underline text-sm"
                        >
                          View on Explorer
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Success State */}
                  {state === 'success' && (
                    <div className="text-center py-8">
                      <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-brand-green/20 flex items-center justify-center">
                          <Check className="w-10 h-10 text-brand-green animate-checkmark" />
                        </div>
                      </div>
                      <p className="text-gray-400 mb-6">
                        {type === 'bet' 
                          ? 'Your prediction has been placed successfully. Good luck!' 
                          : type === 'deposit'
                          ? 'Your deposit has been processed successfully!'
                          : type === 'withdraw'
                          ? 'Your withdrawal has been processed successfully!'
                          : 'Transaction completed successfully!'}
                      </p>
                      
                      {type === 'bet' && outcome && teamA && teamB && (
                        <div className="mb-6">
                          <ShareButton
                            text={generatePredictionShareText({
                              marketName: marketName || '',
                              teamA,
                              teamB,
                              outcome,
                              amount,
                              odds,
                              potentialWin,
                              sportEmoji,
                              league,
                            })}
                            marketId={marketId}
                            variant="secondary"
                            size="md"
                            className="mb-3"
                          />
                        </div>
                      )}
                      
                      <button
                        onClick={onClose}
                        className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  )}

                  {/* Error State */}
                  {state === 'error' && (
                    <div className="text-center py-8">
                      <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                          <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                      </div>
                      <p className="text-red-400 mb-2 font-semibold">Transaction Failed</p>
                      <p className="text-gray-400 text-sm mb-6">{error || 'An error occurred. Please try again.'}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={onClose}
                          className="flex-1 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={onRetry}
                          className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                        >
                          Try Again
                        </button>
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
