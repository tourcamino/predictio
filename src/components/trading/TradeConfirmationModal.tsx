import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, Check, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatPnL, formatPctChange } from '~/lib/trading/calculations';

type TransactionState = 'review' | 'pending' | 'mining' | 'success' | 'error';
type TradeType = 'sell' | 'buy' | 'add';

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TransactionState;
  type: TradeType;
  
  // Position info
  marketName: string;
  outcome: string;
  side: 'YES' | 'NO' | 'DRAW';
  
  // Trade details
  shares?: number;
  price?: number;
  amount?: number;
  
  // Sell-specific
  proceeds?: number;
  realizedPnL?: number;
  realizedPnLPct?: number;
  
  // Buy-specific
  newAvgEntry?: number;
  totalShares?: number;
  fee?: number;
  
  // Transaction
  txHash?: string;
  error?: string;
  
  // Actions
  onConfirm?: () => void;
  onRetry?: () => void;
}

export function TradeConfirmationModal({
  isOpen,
  onClose,
  state,
  type,
  marketName,
  outcome,
  side,
  shares = 0,
  price = 0,
  amount = 0,
  proceeds = 0,
  realizedPnL = 0,
  realizedPnLPct = 0,
  newAvgEntry = 0,
  totalShares = 0,
  fee = 0,
  txHash,
  error,
  onConfirm,
  onRetry,
}: TradeConfirmationModalProps) {
  const getTitle = () => {
    switch (state) {
      case 'review':
        return type === 'sell' ? 'Confirm Sale' : 'Confirm Purchase';
      case 'pending':
        return 'Waiting for Approval';
      case 'mining':
        return 'Transaction Submitted';
      case 'success':
        return type === 'sell' ? 'Position Sold! ✓' : 'Position Added! ✓';
      case 'error':
        return 'Transaction Failed';
      default:
        return '';
    }
  };

  const pnlFormatted = formatPnL(realizedPnL);
  const pctFormatted = formatPctChange(realizedPnLPct);

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
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-250"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-lg sm:max-w-xl transform overflow-hidden rounded-2xl bg-brand-navy border border-brand-green/40 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] transition-all max-h-[min(92dvh,880px)]">
                {/* Close button */}
                {state !== 'pending' && state !== 'mining' && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                    aria-label="Chiudi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <div className="p-5 sm:p-7 overflow-y-auto overscroll-contain">
                  <Dialog.Title className="font-syne text-2xl sm:text-3xl font-bold mb-6 text-center text-white pr-10">
                    {getTitle()}
                  </Dialog.Title>

                  {/* Review State - Sell */}
                  {state === 'review' && type === 'sell' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Market</p>
                        <p className="font-semibold">{marketName}</p>
                        <p className="text-xs text-gray-400 mt-1">{outcome}</p>
                      </div>

                      <div className="p-3 bg-gradient-to-br from-red-500/20 to-red-500/5 border-2 border-red-500/40 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <TrendingDown className="w-5 h-5 text-red-500" />
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Selling</div>
                            <div className="text-xl font-bold">
                              {shares.toLocaleString()} shares
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">You'll receive</div>
                            <div className="text-base font-bold text-brand-green">
                              ${proceeds.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Realized P&L</div>
                            <div className={`text-base font-bold ${pnlFormatted.colorClass}`}>
                              {pnlFormatted.text}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-white/5 rounded-lg space-y-2 font-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Shares:</span>
                          <span className="font-bold">{shares.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Exit price:</span>
                          <span>${price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Proceeds:</span>
                          <span className="font-semibold text-brand-green">${proceeds.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10">
                          <span className="text-gray-400">P&L:</span>
                          <div className="text-right">
                            <div className={pnlFormatted.colorClass}>{pnlFormatted.text}</div>
                            <div className={`text-xs ${pctFormatted.colorClass}`}>{pctFormatted.text}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                        <button
                          onClick={onClose}
                          className="flex-1 min-h-[48px] py-3 px-4 border border-white/25 rounded-xl hover:bg-white/10 transition-colors font-semibold text-base"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={onConfirm}
                          className="flex-1 min-h-[48px] py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors text-base"
                        >
                          Conferma vendita
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Review State - Buy/Add */}
                  {state === 'review' && (type === 'buy' || type === 'add') && (
                    <div className="space-y-3">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Market</p>
                        <p className="font-semibold">{marketName}</p>
                        <p className="text-xs text-gray-400 mt-1">{outcome}</p>
                      </div>

                      <div className="p-3 bg-gradient-to-br from-brand-green/20 to-brand-green/5 border-2 border-brand-green/40 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <TrendingUp className="w-5 h-5 text-brand-green" />
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">{type === 'add' ? 'Adding' : 'Buying'}</div>
                            <div className="text-xl font-bold text-brand-green">
                              {shares.toLocaleString()} shares
                            </div>
                          </div>
                        </div>
                        
                        {type === 'add' && (
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">New avg entry</div>
                              <div className="text-base font-bold">
                                ${newAvgEntry.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">Total shares</div>
                              <div className="text-base font-bold">
                                {totalShares.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-white/5 rounded-lg space-y-2 font-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="font-bold">${amount.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Entry price:</span>
                          <span>${price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fee (0.8%):</span>
                          <span>~${fee.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10">
                          <span className="text-gray-400">You'll receive:</span>
                          <span className="font-semibold text-brand-green">{shares.toLocaleString()} shares</span>
                        </div>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                        <button
                          onClick={onClose}
                          className="flex-1 min-h-[48px] py-3 px-4 border border-white/25 rounded-xl hover:bg-white/10 transition-colors font-semibold text-base"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={onConfirm}
                          className="flex-1 min-h-[48px] py-3 px-4 bg-brand-green text-brand-bg font-bold rounded-xl hover:bg-brand-green/90 transition-colors text-base shadow-lg shadow-brand-green/20"
                        >
                          Conferma acquisto
                        </button>
                      </div>
                    </div>
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
                          href={`https://gnosisscan.io/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-brand-green hover:underline text-sm"
                        >
                          View on Explorer
                        </a>
                      )}
                    </div>
                  )}

                  {/* Success State */}
                  {state === 'success' && (
                    <div className="text-center py-8">
                      <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-brand-green/20 flex items-center justify-center">
                          <Check className="w-10 h-10 text-brand-green" />
                        </div>
                      </div>
                      <p className="text-gray-400 mb-6">
                        {type === 'sell' 
                          ? 'Your position has been sold successfully!' 
                          : 'Your position has been updated successfully!'}
                      </p>
                      
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
                      <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                        {error || 'An error occurred. Please try again.'}
                      </p>
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
