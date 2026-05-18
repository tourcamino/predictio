import { AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import {
  demoBannerPrimaryLine,
  demoBannerSecondaryHint,
} from '~/lib/economySurface';
import {
  dismissDemoBanner,
  isDemoBannerDismissed,
  isWalletActiveTrader,
} from '~/lib/onboarding/onboardingGate';

export function DemoBanner() {
  const { isConnected, address } = useWallet();
  const { isActive: isDemoActive } = useDemoAccount();
  const walletKey = normalizeWalletForQuery(address);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDemoBannerDismissed(walletKey)) {
      setIsDismissed(true);
      return;
    }
    if (walletKey && isWalletActiveTrader(walletKey)) {
      setIsDismissed(true);
    }
  }, [walletKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    dismissDemoBanner(walletKey);
    window.dispatchEvent(new Event('demo-banner-dismissed'));
  };

  const primary = demoBannerPrimaryLine({ isConnected, isDemoActive });
  const secondary = demoBannerSecondaryHint();

  if (isDismissed) return null;

  return (
    <div className="relative z-[100] bg-[#00FF87]/10 border-b border-[#00FF87]/30">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <AlertCircle className="w-4 h-4 text-[#00FF87] flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[#00FF87] text-sm font-semibold leading-snug">{primary}</p>
            {secondary ? (
              <p className="text-[#00FF87]/80 text-xs mt-1 leading-snug">{secondary}</p>
            ) : null}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-[#00FF87]/20 rounded transition-colors shrink-0"
          aria-label="Dismiss banner"
          type="button"
        >
          <X className="w-4 h-4 text-[#00FF87]" />
        </button>
      </div>
    </div>
  );
}
