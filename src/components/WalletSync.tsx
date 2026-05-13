import { useEffect, useState, useRef } from 'react';
import { TRPCClientError } from '@trpc/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTRPC } from '~/trpc/react';
import { useWallet, useWalletStore } from '~/store/useWalletStore';
import { OnboardingModal } from '~/components/onboarding/OnboardingModal';
import { invalidateWalletPointsSummary } from '~/utils/invalidateWalletNotifications';
import { normalizeWalletForQuery } from '~/utils/walletQuery';

const SYNC_DEBOUNCE_MS = 280;
const MAX_SILENT_RETRIES = 6;

// Helper to read cookie
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/** Network / cold start / DB — retry without blaming the wallet. */
function isTransientSyncError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    const data = error.data as
      | { code?: string; httpStatus?: number }
      | undefined;
    const code = data?.code;
    if (
      code === 'INTERNAL_SERVER_ERROR' ||
      code === 'TIMEOUT' ||
      code === 'SERVICE_UNAVAILABLE' ||
      code === 'CLIENT_CLOSED_REQUEST'
    ) {
      return true;
    }
    const http = data?.httpStatus;
    if (typeof http === 'number' && http >= 500) return true;
  }
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('non-json') ||
    msg.includes("can't reach database") ||
    msg.includes('reach database') ||
    msg.includes('econnrefused') ||
    msg.includes('socket') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('timeout')
  );
}

/**
 * Component that syncs wallet account with database on connection
 * Automatically creates account with $1,000 virtual balance for new users
 * Updates wallet store with real balance from database
 */
export function WalletSync() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isConnected, address, updateBalance, setSyncing } = useWallet();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const lastSyncedAddressRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const silentRetryCountRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncMutation = useMutation(trpc.syncUserAccount.mutationOptions());

  const clearDebounce = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const clearRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  useEffect(() => {
    clearDebounce();
    clearRetry();

    if (!isConnected || !address) {
      lastSyncedAddressRef.current = null;
      syncInFlightRef.current = false;
      silentRetryCountRef.current = 0;
      setSyncing(false);
      return;
    }

    const addressKey = normalizeWalletForQuery(address);
    if (!addressKey) {
      return;
    }

    if (lastSyncedAddressRef.current === addressKey) {
      return;
    }

    silentRetryCountRef.current = 0;

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;

      const runSync = () => {
        const live = useWalletStore.getState();
        if (!live.isConnected || !live.address) return;
        const addr = live.address;
        const walletKey = normalizeWalletForQuery(addr);
        if (!walletKey) return;
        if (lastSyncedAddressRef.current === walletKey) return;
        if (syncInFlightRef.current) return;

        syncInFlightRef.current = true;
        setSyncing(true);

        const refCodeFromCookie = getCookie('predictio_ref');
        console.log(
          `[REFERRAL] Cookie check: ${refCodeFromCookie ? `Found code ${refCodeFromCookie}` : 'No cookie found'}`,
        );

        syncMutation.mutate(
          {
            walletAddress: walletKey,
            referralCode: refCodeFromCookie || undefined,
          },
          {
            onSuccess: (data) => {
              lastSyncedAddressRef.current = walletKey;
              silentRetryCountRef.current = 0;
              clearRetry();

              updateBalance(data.virtualBalance);
              setSyncing(false);

              invalidateWalletPointsSummary(
                queryClient,
                trpc.getPointsSummary.queryKey,
                walletKey,
              );

              if (refCodeFromCookie) {
                document.cookie =
                  'predictio_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
                console.log('[REFERRAL] Referral cookie cleared after attribution');
              }

              if (data.isNewUser) {
                console.log(
                  `[Paper Trading] New account created with $${data.virtualBalance} virtual balance`,
                );
                toast.success(
                  `Welcome! You've been credited with $${data.virtualBalance} USDC for trading.`,
                  { duration: 5000, icon: '🎉' },
                );
              } else {
                console.log(
                  `[Paper Trading] Account synced — balance $${data.virtualBalance} USDC (no toast)`,
                );
              }

              if (!data.onboardingCompleted) {
                setShowOnboarding(true);
              }
            },
            onError: (error) => {
              console.error('[Paper Trading] Failed to sync account:', error);
              setSyncing(false);

              const transient = isTransientSyncError(error);
              if (transient && silentRetryCountRef.current < MAX_SILENT_RETRIES) {
                silentRetryCountRef.current += 1;
                const delay = Math.min(
                  10_000,
                  450 * 2 ** (silentRetryCountRef.current - 1),
                );
                console.warn(
                  `[Paper Trading] Sync retry ${silentRetryCountRef.current}/${MAX_SILENT_RETRIES} in ${delay}ms`,
                );
                clearRetry();
                retryTimerRef.current = setTimeout(() => {
                  retryTimerRef.current = null;
                  syncInFlightRef.current = false;
                  runSync();
                }, delay);
                return;
              }

              silentRetryCountRef.current = 0;

              let detail = '';
              if (error instanceof TRPCClientError) {
                detail = error.message?.trim() ?? '';
              } else if (error instanceof Error) {
                detail = error.message.trim();
              }
              const suffix =
                detail && detail.length > 0
                  ? ` ${detail.length > 180 ? `${detail.slice(0, 180)}…` : detail}`
                  : '';

              toast.error(
                `Could not load your account from the server.${suffix} Your wallet stays connected — try again in a moment or refresh the page.`,
                { duration: 6500 },
              );
            },
            onSettled: () => {
              syncInFlightRef.current = false;
            },
          },
        );
      };

      runSync();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      clearDebounce();
      clearRetry();
    };
    // Intentionally omit syncMutation / queryClient / trpc / updateBalance — stable or would retrigger sync loops.
  }, [isConnected, address]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </>
  );
}
