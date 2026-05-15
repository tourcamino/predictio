import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';

export function DemoBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('demo-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('demo-banner-dismissed', 'true');
    window.dispatchEvent(new Event('demo-banner-dismissed'));
  };

  if (isDismissed) return null;

  return (
    <div className="relative z-[100] border-b border-white/10 bg-brand-bg/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400 leading-snug flex-1 min-w-0">
          Pre-testnet ·{' '}
          <span className="text-brand-green font-medium">Paper USDC</span> trading environment
          <span className="text-gray-500"> · </span>
          <Link to="/risk-disclosure" className="text-gray-500 hover:text-brand-green transition-colors">
            Learn more
          </Link>
        </p>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/5 rounded transition-colors shrink-0 text-gray-500 hover:text-gray-300"
          aria-label="Dismiss banner"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
