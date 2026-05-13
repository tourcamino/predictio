import { AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';

export function DemoBanner() {
  const { isConnected } = useWallet();
  const { isActive: isDemoActive } = useDemoAccount();
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check if banner was dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('demo-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);
  
  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('demo-banner-dismissed', 'true');
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('demo-banner-dismissed'));
  };
  
  const bannerText = !isConnected
    ? '👀 Guest mode — Connect wallet to save your progress and get $1,000 demo USDC'
    : isDemoActive
      ? '🟢 DEMO — Trading with $1,000 virtual USDC · Switch to Real when ready'
      : '🟠 REAL — Trading with your USDC on Base';

  if (isDismissed) return null;
  
  return (
    <div className="relative z-[100] bg-[#00FF87]/10 border-b border-[#00FF87]/30">
      <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 justify-center">
          <AlertCircle className="w-4 h-4 text-[#00FF87] flex-shrink-0" />
          <span className="text-[#00FF87] text-sm font-semibold">
            {bannerText}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-[#00FF87]/20 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4 text-[#00FF87]" />
        </button>
      </div>
    </div>
  );
}
