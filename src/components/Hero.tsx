import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '~/store/useWalletStore';
import { useNavigate } from '@tanstack/react-router';
import { FOOTBALL_FOCUS_CONFIG, isFootballFocusEnabled } from '~/config/footballFocus';
import { fetchCuratedMarketsFromApi } from '~/utils/curatedMarketsApi';

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const { isConnected, openWalletModal } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const curatedQuery = useQuery({
    queryKey: ['hero-curated-markets'],
    queryFn: fetchCuratedMarketsFromApi,
    staleTime: 60_000,
  });
  const liveMarketCount = curatedQuery.data?.total ?? curatedQuery.data?.markets?.length ?? 0;

  const handleStartPredicting = () => {
    if (isConnected) {
      navigate({ to: '/markets' });
    } else {
      openWalletModal();
    }
  };

  const handleExploreMatches = () => {
    const element = document.getElementById('markets');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-4">
      {/* Noise Texture Overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Green Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-green/20 blur-[120px] rounded-full" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Title */}
        <h1
          className={`font-syne font-bold text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] mb-6 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {isFootballFocusEnabled() ? (
            <>
              {FOOTBALL_FOCUS_CONFIG.HERO.headline}
            </>
          ) : (
            <>
              Trade the Future.
              <br />
              <span className="text-brand-green">Own the Outcome.</span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p
          className={`text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {isFootballFocusEnabled() 
            ? FOOTBALL_FOCUS_CONFIG.HERO.subheadline
            : 'The first global sports prediction market powered by DeFi. Trade YES/NO shares on any sport, any league, any continent — with USDC, no middlemen.'
          }
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 transition-all duration-700 delay-[450ms] ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button 
            onClick={handleStartPredicting}
            className="px-8 py-4 bg-brand-green text-brand-bg font-semibold text-base rounded hover:bg-brand-green/90 transition-all hover:scale-105 w-full sm:w-auto"
          >
            {isConnected ? 'Go to Markets →' : (isFootballFocusEnabled() ? FOOTBALL_FOCUS_CONFIG.HERO.ctaPrimary : 'Start Trading')}
          </button>
          <button 
            onClick={handleExploreMatches}
            className="px-8 py-4 bg-transparent border-2 border-white/20 text-white font-semibold text-base rounded hover:border-brand-green hover:text-brand-green transition-all w-full sm:w-auto"
          >
            {isFootballFocusEnabled() ? FOOTBALL_FOCUS_CONFIG.HERO.ctaSecondary : 'How It Works'}
          </button>
        </div>

        {/* Supporting Line */}
        {isFootballFocusEnabled() && FOOTBALL_FOCUS_CONFIG.HERO.supportingLine && (
          <div
            className={`text-sm font-semibold text-brand-green mb-12 transition-all duration-700 delay-[500ms] ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {FOOTBALL_FOCUS_CONFIG.HERO.supportingLine}
          </div>
        )}

        {/* Stats */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 font-mono text-sm text-gray-400 transition-all duration-700 delay-[600ms] ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {isFootballFocusEnabled() ? (
            <>
              <span className="text-brand-cyan font-medium">
                {liveMarketCount > 0 ? `${liveMarketCount} live markets` : 'Live football markets'}
              </span>
              <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full" />
              <span className="text-gray-500">Paper trading · USDC</span>
            </>
          ) : (
            <>
              <span className="text-brand-cyan font-medium">
                {liveMarketCount > 0 ? `${liveMarketCount} curated markets` : 'Curated markets loading…'}
              </span>
              <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full" />
              <span className="text-gray-500">Paper trading environment</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
