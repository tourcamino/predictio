import { X, Hexagon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';

export function Season1Banner() {
  const { isConnected } = useWallet();
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check if banner was dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('season1-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);
  
  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('season1-banner-dismissed', 'true');
    window.dispatchEvent(new Event('season1-banner-dismissed'));
  };
  
  // Only show to connected wallets
  if (!isConnected || isDismissed) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-[#00FF87]/10 border-b border-[#00FF87]/25" style={{ height: '32px' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 justify-center">
          <Hexagon className="w-3 h-3 text-[#00FF87] flex-shrink-0" />
          <Link 
            to="/account" 
            className="text-[#00FF87] text-sm font-semibold hover:underline"
          >
            Season 1 is live — trade, earn points, climb the leaderboard →
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-[#00FF87]/20 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-3 h-3 text-[#00FF87]" />
        </button>
      </div>
    </div>
  );
}
