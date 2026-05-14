import { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Target, Wallet, LineChart } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import {
  BASE_SEPOLIA_FAUCET_URL,
  getExpectedPredictioChain,
  isPredictioTestnet,
} from '~/lib/economySurface';
import { pushBodyScrollLock, pushHtmlScrollLock } from '~/lib/bodyScrollLock';

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

/** Above main app chrome (e.g. mobile nav z-[9999]). */
const ONBOARDING_Z = 'z-[10050]';

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
    if (!isOpen) return;
    const releaseHtml = pushHtmlScrollLock();
    const releaseBody = pushBodyScrollLock();
    return () => {
      releaseBody();
      releaseHtml();
    };
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

  const persistOnboardingDone = useCallback(() => {
    if (!walletKey) return;
    completeOnboardingMutation.mutate(
      { walletAddress: walletKey },
      {
        onError: (e) => console.error('[OnboardingModal] completeOnboarding failed:', e),
      },
    );
  }, [walletKey, completeOnboardingMutation]);

  const handleComplete = useCallback(() => {
    persistDismissLocal();
    onComplete();
    persistOnboardingDone();
  }, [persistDismissLocal, onComplete, persistOnboardingDone]);

  const handleSkip = useCallback(() => {
    persistDismissLocal();
    onSkip();
    persistOnboardingDone();
  }, [persistDismissLocal, onSkip, persistOnboardingDone]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleSkip]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${ONBOARDING_Z} flex flex-col motion-safe:animate-fade-in`}
      role="presentation"
    >
      {/* Fullscreen overlay: dims page, blocks interaction with content behind */}
      <div
        className="absolute inset-0 bg-brand-bg/90 backdrop-blur-[3px]"
        aria-hidden
      />

      {/* Centered panel + scroll if viewport is short */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className="relative flex w-full max-w-[720px] max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-white/12 bg-brand-navy shadow-2xl shadow-black/60 ring-1 ring-white/5"
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-green/90">
                Step {step} of 3
              </p>
              <div className="flex gap-1 rounded-lg bg-white/5 p-0.5">
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
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2.5 text-gray-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Close onboarding"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2
                    id="onboarding-title"
                    className="font-syne text-xl font-bold tracking-tight text-white sm:text-2xl"
                  >
                    Welcome to Predictio
                  </h2>
                  <p className="mt-1.5 text-sm text-gray-400">
                    Sports prediction markets on {getExpectedPredictioChain().shortLabel}
                    {isPredictioTestnet() ? ' (testnet)' : ''} — trade outcomes, not fixed book odds.
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-col sm:items-start">
                    <Target className="h-5 w-5 shrink-0 text-brand-green" />
                    <div>
                      <p className="text-sm font-semibold text-white">YES / NO</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500">
                        Tokens on real fixtures.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-col sm:items-start">
                    <Wallet className="h-5 w-5 shrink-0 text-brand-green" />
                    <div>
                      <p className="text-sm font-semibold text-white">Paper wallet</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500">
                        $1,000 virtual USDC (Predictio account). Not bank money, not on-chain profit.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-col sm:items-start">
                    <LineChart className="h-5 w-5 shrink-0 text-brand-green" />
                    <div>
                      <p className="text-sm font-semibold text-white">Trade or copy</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500">
                        Markets, leaderboard, copy flow.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-500">
                  Board prices ≈ crowd-implied probability. Paper mode — no real yield.
                </p>

                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/35 bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" />
                    Demo — no real funds
                  </span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-syne text-lg font-bold text-white sm:text-xl">
                  Demo mode &amp; your wallet
                </h2>
                <p className="text-sm text-gray-400">
                  Your wallet signs you in. Prediction stakes use{' '}
                  <strong className="text-white/90">Predictio paper USDC</strong> (server) — not the
                  ERC-20 balance inside your wallet unless we explicitly say on-chain.
                </p>
                {isPredictioTestnet() && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95">
                    <span className="font-semibold text-amber-200">Base Sepolia</span> — get ETH from a{' '}
                    <a
                      href={BASE_SEPOLIA_FAUCET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold text-amber-100 hover:text-white"
                    >
                      faucet
                    </a>{' '}
                    for gas. Test tokens have no cash value.
                  </div>
                )}
                <ul className="space-y-2.5 text-sm text-gray-300">
                  <li className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                    <span>
                      <strong className="text-white">$1,000 virtual USDC</strong> to learn flows safely.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                    <span>Same UX as live: markets, positions, copy — without custody risk in demo.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                    <span>Disconnect anytime from the wallet menu.</span>
                  </li>
                </ul>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Virtual balance
                </p>
                <p className="font-mono text-3xl font-bold text-brand-green sm:text-4xl">
                  ${balanceCounter.toFixed(2)}
                </p>
                <h2 className="font-syne text-lg font-bold text-white sm:text-xl">You&apos;re set</h2>
                <p className="mx-auto max-w-md text-sm text-gray-400">
                  Jump into markets, copy traders, or browse the leaderboard — still paper, still
                  risk-free.
                </p>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
                  <Link
                    to="/markets"
                    onClick={handleComplete}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-green py-3 text-center text-sm font-bold text-brand-bg hover:bg-brand-green/90 sm:flex-initial sm:min-w-[140px]"
                  >
                    Markets
                  </Link>
                  <Link
                    to="/copy"
                    onClick={handleComplete}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 py-3 text-center text-sm font-semibold text-white hover:bg-white/10 sm:flex-initial sm:min-w-[140px]"
                  >
                    Copy trade
                  </Link>
                </div>
                <Link
                  to="/leaderboard"
                  onClick={handleComplete}
                  className="inline-block text-sm font-semibold text-brand-cyan hover:text-brand-cyan/85"
                >
                  Leaderboard
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 space-y-3 border-t border-white/10 bg-brand-bg/40 px-4 py-3 sm:px-5 sm:py-4">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green/40"
              />
              <span>Don&apos;t show again for this wallet</span>
            </label>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Continue to platform
            </button>

            {step === 1 && (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="rounded-xl py-2.5 text-sm text-gray-500 hover:text-gray-300 sm:px-4"
                >
                  Skip tour
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green py-2.5 text-sm font-bold text-brand-bg hover:bg-brand-green/90 sm:min-w-[140px]"
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-2.5 text-sm font-bold text-brand-bg hover:bg-brand-green/90"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-xl py-2 text-sm text-gray-500 hover:text-gray-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-center gap-1.5 border-t border-white/5 py-2.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-6 bg-brand-green' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
