import { useWallet } from '~/store/useWalletStore';
import { useNavigate } from '@tanstack/react-router';

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
    <section className="relative py-20 lg:py-28 bg-brand-navy overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-brand-green/12 blur-[150px] rounded-full" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-syne font-bold text-3xl sm:text-4xl lg:text-5xl mb-5 text-white">
          Build through conviction
        </h2>
        <p className="text-base sm:text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Non-custodial positioning on curated outcomes — fewer events, clearer narratives, and a
          visual language tuned for intelligence over spectacle.
        </p>

        <button
          type="button"
          onClick={handleCTA}
          className="px-9 py-4 bg-brand-green text-brand-bg font-semibold text-base rounded-lg hover:bg-brand-green/90 transition-colors mb-8"
        >
          {isConnected ? 'Open markets →' : 'Connect wallet'}
        </button>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-xs text-gray-600">
          <span>Azuro protocol</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-700 rounded-full" />
          <span>Self-custody</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-700 rounded-full" />
          <span>USDC margin</span>
        </div>
      </div>
    </section>
  );
}
