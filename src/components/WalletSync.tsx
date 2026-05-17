import { useEffect, useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WALLET_TOAST_IDS,
  walletToastDismiss,
  walletToastError,
  walletToastLoading,
  walletToastSuccess,
} from '~/lib/walletToast';
import { useTRPC } from '~/trpc/react';
import { useWallet, useWalletStore } from '~/store/useWalletStore';
import {
  OnboardingModal,
  isWelcomeOnboardingDismissedInStorage,
} from '~/components/onboarding/OnboardingModal';
import { invalidateAllWalletScopedQueries } from '~/utils/invalidateAllWalletScopedQueries';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import {
  isTransientSyncError,
  userFacingSyncFailureDetail,
} from '~/utils/syncErrorUtils';
import {
  expressSyncUserAccount,
  shouldUseExpressForWalletCritical,
} from '~/lib/expressCriticalWalletApi';
import { walletConnectTrace } from '~/lib/walletConnectTrace';
import { WALLET_SYNC_WALL_CLOCK_MS } from '~/lib/walletModalUxTiming';

const SYNC_DEBOUNCE_MS = 280;
const MAX_SILENT_RETRIES = 3;

// Helper to read cookie
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Component that syncs wallet account with database on connection
 * Automatically creates account with $1,000 virtual balance for new users
 * Updates wallet store with real balance from database
 */
export function WalletSync() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isConnected, address, setSyncing, setSyncDegraded } = useWallet();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const lastSyncedAddressRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const silentRetryCountRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncWallClockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const clearSyncWallClock = () => {
    if (syncWallClockTimerRef.current) {
      clearTimeout(syncWallClockTimerRef.current);
      syncWallClockTimerRef.current = null;
    }
  };

  useEffect(() => {
    clearDebounce();
    clearRetry();
    clearSyncWallClock();

    if (!isConnected || !address) {
      lastSyncedAddressRef.current = null;
      syncInFlightRef.current = false;
      silentRetryCountRef.current = 0;
      setSyncing(false);
      setSyncDegraded(false);
      walletToastDismiss(WALLET_TOAST_IDS.syncLoading);
      return;
    }

    const addressKey = normalizeWalletForQuery(address);
    if (!addressKey) {
      return;
    }

    if (lastSyncedAddressRef.current === addressKey) {
      return;
    }

    if (
      lastSyncedAddressRef.current &&
      lastSyncedAddressRef.current !== addressKey
    ) {
      walletConnectTrace("sync_wallet_changed", {
        from: lastSyncedAddressRef.current,
        to: addressKey,
      });
      syncInFlightRef.current = false;
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

        const isStillTargetWallet = () => {
          const live = useWalletStore.getState();
          return (
            live.isConnected &&
            normalizeWalletForQuery(live.address) === walletKey
          );
        };

        syncInFlightRef.current = true;
        setSyncing(true);
        walletConnectTrace("sync_user_start", { walletKey });
        clearSyncWallClock();
        syncWallClockTimerRef.current = setTimeout(() => {
          syncWallClockTimerRef.current = null;
          if (!isStillTargetWallet()) return;
          walletConnectTrace("sync_user_wall_clock_abort", { walletKey });
          syncInFlightRef.current = false;
          setSyncing(false);
          setSyncDegraded(true);
          walletToastDismiss(WALLET_TOAST_IDS.syncLoading);
        }, WALLET_SYNC_WALL_CLOCK_MS);

        const refCodeFromCookie = getCookie('predictio_ref');
        console.log(
          `[REFERRAL] Cookie check: ${refCodeFromCookie ? `Found code ${refCodeFromCookie}` : 'No cookie found'}`,
        );

        const handleSyncSuccess = (data: {
          isNewUser: boolean;
          virtualBalance: number;
          onboardingCompleted: boolean;
        }) => {
          if (!isStillTargetWallet()) return;

          lastSyncedAddressRef.current = walletKey;
          silentRetryCountRef.current = 0;
          clearRetry();

          clearSyncWallClock();
          setSyncing(false);
          setSyncDegraded(false);
          walletToastDismiss(WALLET_TOAST_IDS.syncLoading);
          walletConnectTrace("sync_user_response", {
            walletKey,
            isNewUser: data.isNewUser,
            virtualBalance: data.virtualBalance,
          });

          invalidateAllWalletScopedQueries(queryClient, trpc, walletKey);

          if (refCodeFromCookie) {
            document.cookie =
              'predictio_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
            console.log('[REFERRAL] Referral cookie cleared after attribution');
          }

          if (data.isNewUser) {
            console.log(
              `[Paper Trading] New account created with $${data.virtualBalance} virtual balance`,
            );
            walletToastSuccess(
              `Welcome! You've been credited with $${data.virtualBalance} USDC for paper trading.`,
              {
                id: WALLET_TOAST_IDS.syncWelcome,
                duration: 5200,
                icon: '🎉',
              },
            );
          } else {
            console.log(
              `[Paper Trading] Account synced — balance $${data.virtualBalance} USDC (no toast)`,
            );
          }

          if (
            !data.onboardingCompleted &&
            !isWelcomeOnboardingDismissedInStorage(walletKey)
          ) {
            setShowOnboarding(true);
          }
        };

        const handleSyncError = (error: unknown) => {
          console.error('[Paper Trading] Failed to sync account:', error);
          walletConnectTrace("sync_user_error", {
            walletKey,
            message: error instanceof Error ? error.message : String(error),
          });
          if (!isStillTargetWallet()) {
            clearSyncWallClock();
            setSyncing(false);
            return;
          }
          clearSyncWallClock();
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
          setSyncDegraded(true);

          const suffix = userFacingSyncFailureDetail(error);

          walletToastDismiss(WALLET_TOAST_IDS.syncLoading);
          walletToastError(
            `Could not load your account from the server.${suffix} Your wallet stays connected — try again in a moment or refresh the page.`,
            { id: WALLET_TOAST_IDS.syncError, duration: 6400 },
          );
        };

        const settle = () => {
          syncInFlightRef.current = false;
        };

        void (async () => {
          const payload = {
            walletAddress: walletKey,
            referralCode: refCodeFromCookie || undefined,
          };
          try {
            const data = shouldUseExpressForWalletCritical()
              ? await expressSyncUserAccount(payload)
              : await syncMutation.mutateAsync(payload);
            handleSyncSuccess(data);
          } catch (error: unknown) {
            handleSyncError(error);
          } finally {
            clearSyncWallClock();
            settle();
            if (!syncInFlightRef.current) {
              setSyncing(false);
            }
            walletConnectTrace("sync_user_settled", { walletKey });
          }
        })();
      };

      runSync();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      clearDebounce();
      clearRetry();
      clearSyncWallClock();
      syncInFlightRef.current = false;
      setSyncing(false);
    };
    // Intentionally omit syncMutation / queryClient / trpc — stable or would retrigger sync loops.
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
