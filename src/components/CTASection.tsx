import { useWallet } from '~/store/useWalletStore';
import { useNavigate } from '@tanstack/react-router';
import { isFootballFocusEnabled } from '~/config/footballFocus';

export function CTASection() {
  const { isConnected, openWalletModal } = useWallet();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (isConnected) {
      navigate({ to: '/markets' });
    } else {
      openWalletModal();
    }
  };

  return (
    <section className="relative py-20 lg:py-32 bg-brand-navy overflow-hidden">
      {/* Green Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-green/20 blur-[150px] rounded-full" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
          {isFootballFocusEnabled() ? 'Ready to Start Trading?' : 'Ready to Predict?'}
        </h2>
        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          {isFootballFocusEnabled() 
            ? 'Trade live football matches with real-time odds. No bookmakers, no limits ÔÇö just pure market dynamics.'
            : 'Join thousands of traders predicting the future of sports. No banks. No limits. Just markets.'
          }
        </p>

        {/* CTA Button */}
        <button 
          onClick={handleCTA}
          className="px-10 py-5 bg-brand-green text-brand-bg font-bold text-lg rounded hover:bg-brand-green/90 transition-all hover:scale-105 mb-8"
        >
          {isConnected 
            ? (isFootballFocusEnabled() ? 'Explore Matches →' : 'Start Predicting →')
            : (isFootballFocusEnabled() ? 'Connect & Trade' : 'Connect Wallet & Start')
          }
        </button>

        {/* Footer Info */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-sm text-gray-500">
          <span>Powered by Azuro Protocol</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
          <span>Non-custodial</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
          <span>USDC</span>
        </div>
      </div>
    </section>
  );
}
