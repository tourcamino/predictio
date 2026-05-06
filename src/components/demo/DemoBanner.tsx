import { AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function DemoBanner() {
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
  
  if (isDismissed) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#00FF87]/10 border-b border-[#00FF87]/30">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 justify-center">
          <AlertCircle className="w-4 h-4 text-[#00FF87] flex-shrink-0" />
          <span className="text-[#00FF87] text-sm font-semibold">
            DEMO MODE — Trading with $1,000 virtual USDC · Connect wallet for real trading
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
