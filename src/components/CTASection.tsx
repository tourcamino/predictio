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
    <section className="relative overflow-hidden bg-brand-navy py-20 lg:py-32">
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green/20 blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-6 font-syne text-4xl font-bold sm:text-5xl lg:text-6xl">
          {isFootballFocusEnabled() ? 'Ready to Start Trading?' : 'Ready to copy-trade?'}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 sm:text-xl">
          {isFootballFocusEnabled()
            ? 'Trade live football matches with real-time odds. No bookmakers, no limits — just pure market dynamics.'
            : 'Nine premium European sports markets, one vault-backed book. Follow analysts, mirror conviction, trade before lock.'}
        </p>

        <button
          type="button"
          onClick={handleCTA}
          className="mb-8 rounded bg-brand-green px-10 py-5 text-lg font-bold text-brand-bg transition-all hover:scale-105 hover:bg-brand-green/90"
        >
          {isConnected
            ? isFootballFocusEnabled()
              ? 'Explore Matches →'
              : 'Start Predicting →'
            : isFootballFocusEnabled()
              ? 'Connect & Trade'
              : 'Connect Wallet & Start'}
        </button>

        <div className="flex flex-col items-center justify-center gap-3 text-sm text-gray-500 sm:flex-row sm:gap-4">
          <span>Powered by Azuro Protocol</span>
          <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
          <span>Non-custodial</span>
          <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
          <span>USDC</span>
        </div>
      </div>
    </section>
  );
}
