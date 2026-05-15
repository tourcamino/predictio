import { useEffect, useState } from 'react';
import { useWallet } from '~/store/useWalletStore';
import { useNavigate } from '@tanstack/react-router';
import { mockPlatformStats } from '~/data/mockData';

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const { isConnected, openWalletModal } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleOpenMarkets = () => {
    if (isConnected) {
      navigate({ to: '/markets' });
    } else {
      openWalletModal();
    }
  };

  const handleScrollCurated = () => {
    const element = document.getElementById('markets');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden pt-6 pb-24">
      <svg className="absolute inset-0 w-full h-full opacity-[0.025]" aria-hidden>
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={4}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:4.5rem_4.5rem]" />

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[560px] h-[320px] bg-brand-green/15 blur-[120px] rounded-full" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className={`text-xs sm:text-sm font-semibold tracking-[0.2em] text-gray-500 uppercase mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          European premium · multisport
        </p>

        <h1
          className={`font-syne font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.12] mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Prediction
          <br />
          <span className="text-brand-green">intelligence</span>
          <span className="text-white">, curated.</span>
        </h1>

        <p
          className={`text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          A calm read on conviction and implied probability across the events that matter — built for
          focus, not for a sportsbook wall of fixtures.
        </p>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            type="button"
            onClick={handleOpenMarkets}
            className="px-8 py-3.5 bg-brand-green text-brand-bg font-semibold text-sm sm:text-base rounded-lg hover:bg-brand-green/90 transition-colors w-full sm:w-auto"
          >
            {isConnected ? 'Research terminal' : 'Connect wallet'}
          </button>
          <button
            type="button"
            onClick={handleScrollCurated}
            className="px-8 py-3.5 bg-transparent border border-white/15 text-white font-semibold text-sm sm:text-base rounded-lg hover:border-brand-green/40 hover:text-brand-green transition-colors w-full sm:w-auto"
          >
            View curated outlook
          </button>
        </div>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500 font-mono transition-all duration-700 delay-[450ms] ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span>${(mockPlatformStats.totalVolume / 1000).toFixed(0)}K+ notional activity</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full" />
          <span>{mockPlatformStats.activeTraders} active accounts</span>
          <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full" />
          <span>{mockPlatformStats.marketsResolved} resolved outcomes</span>
        </div>
      </div>
    </section>
  );
}
