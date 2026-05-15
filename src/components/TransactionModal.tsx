import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link } from '@tanstack/react-router';
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
  /** Pre-testnet paper flow — no wallet approval or block explorer */
  paperTrade?: boolean;
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
  paperTrade = false,
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
  const isPaperBet = paperTrade && type === 'bet';

  const getTitle = () => {
    if (isPaperBet) {
      switch (state) {
        case 'review':
          return 'Confirm prediction';
        case 'pending':
        case 'mining':
          return 'Placing prediction…';
        case 'success':
          return 'Prediction placed';
        case 'error':
          return 'Could not place prediction';
        default:
          return '';
      }
    }

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

  const showClose =
    state !== 'pending' && (!isPaperBet || state !== 'mining') && state !== 'mining';

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
              <Dialog.Panel className="relative w-full max-w-lg sm:max-w-xl transform overflow-hidden rounded-2xl bg-brand-navy border border-brand-green/40 shadow-[0_0_0_1px_rgba(0,255,135,0.12),0_25px_60px_-15px_rgba(0,0,0,0.55)] transition-all max-h-[min(92dvh,880px)] flex flex-col">
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <div className="p-5 sm:p-7 overflow-y-auto overscroll-contain">
                  <Dialog.Title
                    className={`font-syne text-2xl sm:text-3xl font-bold text-center text-white pr-10 ${
                      state === 'review' && type === 'bet' ? 'mb-2' : 'mb-6'
                    }`}
                  >
                    {getTitle()}
                  </Dialog.Title>
                  {state === 'review' && type === 'bet' && (
                    <p className="text-center text-sm text-gray-400 mb-6 sm:mb-7">
                      {isPaperBet
                        ? 'Review your stake — paper USDC only, no on-chain transfer.'
                        : 'Check amounts and confirm your purchase.'}
                    </p>
                  )}

                  {/* Review State */}
                  {state === 'review' && (
                    <>
                      {(type === 'deposit' || type === 'withdraw') && children ? (
                        children
                      ) : type === 'bet' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Market</p>
                        <p className="font-semibold text-base sm:text-lg text-white leading-snug">{marketName}</p>
                      </div>

                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Your pick</p>
                        <p className="font-syne text-lg sm:text-xl font-bold text-brand-green">{outcome}</p>
                      </div>

                      <div className="p-5 sm:p-6 bg-gradient-to-br from-brand-green/25 via-brand-green/10 to-transparent border-2 border-brand-green/50 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <div className="text-center mb-4">
                          <div className="text-xs sm:text-sm text-gray-300 mb-2">If you win, payout</div>
                          <div className="text-3xl sm:text-4xl font-bold text-brand-green tabular-nums">
                            ${potentialWin.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center text-sm text-gray-300 mb-4">
                          Stake{' '}
                          <span className="font-semibold text-white">${amount.toFixed(2)}</span>
                          <span className="mx-1 text-gray-500">→</span>
                          payout{' '}
                          <span className="font-semibold text-brand-green">${potentialWin.toFixed(2)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/15">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Net profit</div>
                            <div className="text-lg font-bold text-brand-green tabular-nums">
                              +${netProfit.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">ROI</div>
                            <div className="text-lg font-bold text-brand-green tabular-nums">
                              +
                              {amount > 0 ? ((netProfit / amount) * 100).toFixed(1) : '0.0'}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3 font-mono text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Stake</span>
                          <span className="font-bold text-white tabular-nums">
                            ${amount.toFixed(2)} {isPaperBet ? 'paper USDC' : 'USDC'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Fee (0.8%)</span>
                          <span className="tabular-nums">
                            ~${fee.toFixed(2)} {isPaperBet ? 'paper USDC' : 'USDC'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Odds</span>
                          <span className="font-semibold tabular-nums">{odds.toFixed(2)}x</span>
                        </div>
                      </div>

                      {fee > 0 && (
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                          <FeeBreakdownCard feeAmount={fee} variant="compact" />
                        </div>
                      )}

                      <div className="flex items-start gap-3 text-sm text-gray-300 p-4 bg-white/5 rounded-xl border border-white/10">
                        <Zap className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-white">
                            {isPaperBet ? 'Pre-testnet · paper execution' : 'Azuro · paper execution'}
                          </p>
                          <p className="text-gray-400 mt-0.5">
                            {isPaperBet
                              ? 'This prediction is recorded on your Predictio paper account. On-chain settlement follows when live contracts are enabled.'
                              : 'On-chain settlement follows Azuro / Base when live contracts are enabled.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-2 pt-2">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 min-h-[48px] py-3 px-4 border border-white/25 rounded-xl hover:bg-white/10 transition-colors font-semibold text-base text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={onConfirm}
                          className="flex-1 min-h-[48px] py-3 px-4 bg-brand-green text-brand-bg font-bold rounded-xl hover:bg-brand-green/90 transition-colors text-base shadow-lg shadow-brand-green/20"
                        >
                          Confirm prediction
                        </button>
                      </div>
                    </div>
                      ) : null}
                    </>
                  )}

                  {/* Pending State (on-chain only) */}
                  {state === 'pending' && !isPaperBet && (
                    <div className="text-center py-8">
                      <div className="mb-6 flex justify-center">
                        <Loader2 className="w-16 h-16 text-brand-green animate-spin" />
                      </div>
                      <p className="text-gray-400 mb-4">Waiting for wallet approval...</p>
                      <p className="text-sm text-gray-500">Check your wallet to approve this transaction</p>
                    </div>
                  )}

                  {/* Mining / placing state */}
                  {state === 'mining' && (
                    <div className="text-center py-8">
                      <div className="mb-6 flex justify-center">
                        <Loader2 className="w-16 h-16 text-brand-green animate-spin" />
                      </div>
                      <p className="text-gray-400 mb-4">
                        {isPaperBet
                          ? 'Recording your paper prediction…'
                          : 'Transaction submitted'}
                      </p>
                      {!isPaperBet && txHash && (
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
                          ? isPaperBet
                            ? `Your paper prediction on ${outcome ?? 'this market'} is saved. Good luck!`
                            : 'Your prediction has been placed successfully. Good luck!'
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

                      <div className="flex flex-col gap-3">
                        {isPaperBet && (
                          <Link
                            to="/portfolio"
                            onClick={onClose}
                            className="w-full py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/15 transition-colors border border-white/20"
                          >
                            View portfolio →
                          </Link>
                        )}
                        <button
                          onClick={onClose}
                          className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                        >
                          Done
                        </button>
                      </div>
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
