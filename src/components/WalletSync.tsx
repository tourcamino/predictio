import { useEffect, useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import { OnboardingModal } from '~/components/onboarding/OnboardingModal';

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
  const { isConnected, address, updateBalance, setSyncing } = useWallet();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Track the last synced address to prevent duplicate syncs
  const lastSyncedAddress = useRef<string | null>(null);
  
  const syncMutation = useMutation(trpc.syncUserAccount.mutationOptions());
  
  useEffect(() => {
    // Sync account when wallet connects or address changes
    // Only sync if we haven't already synced this address
    if (isConnected && address && address !== lastSyncedAddress.current && !syncMutation.isPending) {
      lastSyncedAddress.current = address;
      setSyncing(true);
      
      // Read referral code from cookie
      const refCodeFromCookie = getCookie('predictio_ref');
      
      console.log(`[REFERRAL] Cookie check: ${refCodeFromCookie ? `Found code ${refCodeFromCookie}` : 'No cookie found'}`);
      
      syncMutation.mutate(
        { 
          walletAddress: address,
          referralCode: refCodeFromCookie || undefined,
        },
        {
          onSuccess: (data) => {
            // Update wallet store with real balance from DB
            updateBalance(data.virtualBalance);
            setSyncing(false);
            
            // Clear referral cookie after successful attribution
            if (refCodeFromCookie) {
              document.cookie = 'predictio_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
              console.log('[REFERRAL] Referral cookie cleared after attribution');
            }
            
            if (data.isNewUser) {
              console.log(`[Paper Trading] New account created with $${data.virtualBalance} virtual balance`);
              toast.success(`Welcome! You've been credited with $${data.virtualBalance} USDC for trading.`, {
                duration: 5000,
                icon: '🎉',
              });
            } else {
              console.log(`[Paper Trading] Account synced - Balance: $${data.virtualBalance}`);
              toast.success(`Wallet synced! Balance: $${data.virtualBalance} USDC`, {
                duration: 3000,
              });
            }
            
            // Show onboarding for new users who haven't completed it
            if (!data.onboardingCompleted) {
              setShowOnboarding(true);
            }
          },
          onError: (error) => {
            console.error('[Paper Trading] Failed to sync account:', error);
            setSyncing(false);
            toast.error('Failed to sync wallet. Please try reconnecting.', {
              duration: 4000,
            });
            // Reset the last synced address on error so we can retry
            lastSyncedAddress.current = null;
          },
        }
      );
    }
    
    // Reset the last synced address when disconnected
    if (!isConnected) {
      lastSyncedAddress.current = null;
      setSyncing(false);
    }
    // syncMutation / updateBalance omitted on purpose to avoid feedback loops when deps update.
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
