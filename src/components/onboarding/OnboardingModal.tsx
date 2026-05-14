import { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Target, Wallet, LineChart } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import { normalizeWalletForQuery } from '~/utils/walletQuery';

/** Per-wallet dismiss flag (works even before next sync reflects `onboardingCompleted`). */
export function welcomeOnboardingDismissStorageKey(walletKey: string): string {
  return `predictio:welcome-onboarding-dismiss:${walletKey.toLowerCase()}`;
}

export function isWelcomeOnboardingDismissedInStorage(walletKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(welcomeOnboardingDismissStorageKey(walletKey)) === '1';
  } catch {
    return false;
  }
}

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  { id: 1, label: 'Markets' },
  { id: 2, label: 'Wallet' },
  { id: 3, label: 'Trade' },
] as const;

export function OnboardingModal({ isOpen, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [balanceCounter, setBalanceCounter] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const trpc = useTRPC();
  const { address } = useWallet();
  const walletKey = normalizeWalletForQuery(address);

  const completeOnboardingMutation = useMutation(
    trpc.completeOnboarding.mutationOptions(),
  );

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setBalanceCounter(0);
      setDontShowAgain(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 3 && balanceCounter < 1000) {
      const duration = 900;
      const steps = 45;
      const increment = 1000 / steps;
      const interval = duration / steps;

      const timer = setInterval(() => {
        setBalanceCounter((prev) => {
          const next = prev + increment;
          if (next >= 1000) {
            clearInterval(timer);
            return 1000;
          }
          return next;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [step, balanceCounter]);

  const persistDismissLocal = useCallback(() => {
    if (!dontShowAgain || !walletKey) return;
    try {
      localStorage.setItem(welcomeOnboardingDismissStorageKey(walletKey), '1');
    } catch {
      /* ignore quota / private mode */
    }
  }, [dontShowAgain, walletKey]);

  const persistOnboardingDone = () => {
    if (!walletKey) return;
    completeOnboardingMutation.mutate(
      { walletAddress: walletKey },
      {
        onError: (e) => console.error('[OnboardingModal] completeOnboarding failed:', e),
      },
    );
  };

  const handleComplete = () => {
    persistDismissLocal();
    onComplete();
    persistOnboardingDone();
  };

  const handleSkip = () => {
    persistDismissLocal();
    onSkip();
    persistOnboardingDone();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Light tint only — does not capture clicks (non-blocking site interaction). */}
      <div
        className="fixed inset-0 z-40 bg-brand-bg/25 pointer-events-none motion-safe:animate-fade-in"
        aria-hidden
      />

      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 sm:pb-4 pt-6 sm:pt-10 pointer-events-none motion-safe:animate-slide-up">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className="pointer-events-auto flex w-full max-w-[min(92vw,860px)] max-h-[min(70vh,680px)] flex-col overflow-hidden rounded-xl border border-white/12 bg-brand-navy/95 shadow-2xl shadow-black/50 backdrop-blur-md"
        >
          {/* Header: step tabs + close */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-white/5 p-0.5">
              {STEPS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStep(id)}
                  className={`flex-1 truncate rounded-md px-2 py-1.5 text-center text-xs font-semibold transition-colors sm:text-sm ${
                    step === id
                      ? 'bg-brand-green text-brand-bg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {id}. {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close onboarding"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-green/90">
                    Predictio · Base
                  </p>
                  <h2
                    id="onboarding-title"
                    className="font-syne text-lg font-bold text-white sm:text-xl"
                  >
                    Welcome to Predictio
                  </h2>
                  <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                    Sports prediction markets — trade outcomes, not bookmaker odds.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="flex gap-2 rounded-lg border border-white/8 bg-white/[0.04] p-2.5 sm:flex-col sm:items-start">
                    <Target className="h-4 w-4 shrink-0 text-brand-green sm:h-5 sm:w-5" />
                    <div>
                      <p className="text-xs font-semibold text-white sm:text-sm">YES / NO</p>
                      <p className="text-[11px] leading-snug text-gray-500 sm:text-xs">
                        Tokens on real events.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 rounded-lg border border-white/8 bg-white/[0.04] p-2.5 sm:flex-col sm:items-start">
                    <Wallet className="h-4 w-4 shrink-0 text-brand-green sm:h-5 sm:w-5" />
                    <div>
                      <p className="text-xs font-semibold text-white sm:text-sm">Demo mode</p>
                      <p className="text-[11px] leading-snug text-gray-500 sm:text-xs">
                        $1,000 virtual USDC — zero risk.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 rounded-lg border border-white/8 bg-white/[0.04] p-2.5 sm:flex-col sm:items-start">
                    <LineChart className="h-4 w-4 shrink-0 text-brand-green sm:h-5 sm:w-5" />
                    <div>
                      <p className="text-xs font-semibold text-white sm:text-sm">Trade or copy</p>
                      <p className="text-[11px] leading-snug text-gray-500 sm:text-xs">
                        Markets, leaderboard, copy-trading.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 rounded-full border border-brand-green/35 bg-brand-green/10 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" />
                  <span className="text-[11px] font-semibold text-brand-green sm:text-xs">
                    Demo — no real funds
                  </span>
                </div>

                <p className="text-center text-[11px] text-gray-500 sm:text-xs">
                  Odds on the board ≈ implied probability — buy low, settle at $1 if you&apos;re right.
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <h2 className="font-syne text-base font-bold text-white sm:text-lg">
                  Demo mode &amp; wallet
                </h2>
                <p className="text-xs text-gray-400 sm:text-sm">
                  You&apos;re signed in with your wallet for paper trading. Funds are virtual — nothing
                  leaves your real wallet in demo.
                </p>
                <ul className="space-y-2 text-left text-[11px] text-gray-300 sm:text-xs">
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-brand-green">●</span>
                    <span>
                      <strong className="text-white">$1,000 virtual USDC</strong> to learn the product.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-brand-green">●</span>
                    <span>
                      Same flows as live: markets, positions, copy — without custody risk in demo.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-brand-green">●</span>
                    <span>Disconnect anytime from the wallet menu.</span>
                  </li>
                </ul>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Virtual balance
                </p>
                <p className="font-mono text-2xl font-bold text-brand-green sm:text-3xl">
                  ${balanceCounter.toFixed(2)}
                </p>
                <h2 className="font-syne text-base font-bold text-white sm:text-lg">
                  Ready to trade
                </h2>
                <p className="mx-auto max-w-md text-xs text-gray-400 sm:text-sm">
                  Explore markets or peek at the leaderboard — still paper, still risk-free.
                </p>
              </div>
            )}
          </div>

          {/* Footer: don’t show again + actions */}
          <div className="shrink-0 space-y-2 border-t border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-gray-400 sm:text-xs">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green/40"
              />
              Non mostrare più questo messaggio su questo wallet
            </label>

            {step === 1 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="order-2 rounded-lg py-2 text-xs text-gray-500 hover:text-gray-300 sm:order-1 sm:px-3"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="order-1 flex items-center justify-center gap-2 rounded-lg bg-brand-green py-2.5 text-sm font-bold text-brand-bg hover:bg-brand-green/90 sm:order-2 sm:min-w-[140px]"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 sm:text-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-green py-2.5 text-xs font-bold text-brand-bg hover:bg-brand-green/90 sm:text-sm"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    to="/markets"
                    onClick={handleComplete}
                    className="flex flex-1 items-center justify-center rounded-lg bg-brand-green py-2.5 text-center text-sm font-bold text-brand-bg hover:bg-brand-green/90"
                  >
                    Markets
                  </Link>
                  <Link
                    to="/copy"
                    onClick={handleComplete}
                    className="flex flex-1 items-center justify-center rounded-lg border border-white/15 bg-white/5 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Copy trade
                  </Link>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <Link
                    to="/leaderboard"
                    onClick={handleComplete}
                    className="text-[11px] font-semibold text-brand-cyan hover:text-brand-cyan/85"
                  >
                    Leaderboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Dots */}
          <div className="flex shrink-0 justify-center gap-1.5 pb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-5 bg-brand-green' : 'w-1.5 bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
