import { useEffect, useState } from 'react';
import { useWallet } from '~/store/useWalletStore';
import { useNavigate } from '@tanstack/react-router';
import { FOOTBALL_FOCUS_CONFIG, isFootballFocusEnabled } from '~/config/footballFocus';
import { getActiveHomeMultisportCopy } from '~/copy/homePremium';
import { mockPlatformStats } from '~/data/mockData';

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const { isConnected, openWalletModal } = useWallet();
  const navigate = useNavigate();
  const multisportCopy = getActiveHomeMultisportCopy();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStartPredicting = () => {
    if (isConnected) {
      navigate({ to: '/markets' });
    } else {
      openWalletModal();
    }
  };

  const handleExploreMatches = () => {
    document.getElementById('markets')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-4">
      {/* Noise Texture Overlay */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03]" aria-hidden>
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
      <div className="absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-green/20 blur-[120px]" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <h1
          className={`mb-6 font-syne text-5xl font-bold leading-[1.1] transition-all duration-700 sm:text-6xl lg:text-7xl xl:text-8xl ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          {isFootballFocusEnabled() ? (
            <>{FOOTBALL_FOCUS_CONFIG.HERO.headline}</>
          ) : (
            <>
              {multisportCopy.heroHeadlineBefore}
              <br />
              <span className="text-brand-green">{multisportCopy.heroHeadlineAccent}</span>
            </>
          )}
        </h1>

        <p
          className={`mx-auto mb-10 max-w-3xl text-lg text-gray-400 transition-all delay-300 duration-700 sm:text-xl ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          {isFootballFocusEnabled()
            ? FOOTBALL_FOCUS_CONFIG.HERO.subheadline
            : multisportCopy.heroSub}
        </p>

        <div
          className={`mb-8 flex flex-col items-center justify-center gap-4 transition-all delay-[450ms] duration-700 sm:flex-row ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={handleStartPredicting}
            className="w-full rounded bg-brand-green px-8 py-4 text-base font-semibold text-brand-bg transition-all hover:scale-105 hover:bg-brand-green/90 sm:w-auto"
          >
            {isConnected
              ? `${multisportCopy.heroCtaPrimaryConnected} →`
              : isFootballFocusEnabled()
                ? FOOTBALL_FOCUS_CONFIG.HERO.ctaPrimary
                : multisportCopy.heroCtaPrimaryGuest}
          </button>
          <button
            type="button"
            onClick={handleExploreMatches}
            className="w-full rounded border-2 border-white/20 bg-transparent px-8 py-4 text-base font-semibold text-white transition-all hover:border-brand-green hover:text-brand-green sm:w-auto"
          >
            {isFootballFocusEnabled()
              ? FOOTBALL_FOCUS_CONFIG.HERO.ctaSecondary
              : multisportCopy.heroCtaSecondary}
          </button>
        </div>

        {isFootballFocusEnabled() && FOOTBALL_FOCUS_CONFIG.HERO.supportingLine ? (
          <div
            className={`mb-12 text-sm font-semibold text-brand-green transition-all delay-[500ms] duration-700 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            {FOOTBALL_FOCUS_CONFIG.HERO.supportingLine}
          </div>
        ) : null}

        <div
          className={`flex flex-col items-center justify-center gap-4 font-mono text-sm text-gray-400 transition-all delay-[600ms] duration-700 sm:flex-row sm:gap-6 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          {isFootballFocusEnabled() ? (
            <>
              <span className="font-medium text-brand-cyan">Live Football Markets</span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
              <span className="font-medium text-brand-cyan">
                ${(mockPlatformStats.totalVolume / 1000).toFixed(0)}K+ Volume
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
              <span className="font-medium text-brand-cyan">{mockPlatformStats.activeTraders}+ Traders</span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
              <span className="font-medium text-brand-cyan">{mockPlatformStats.totalCopiers} Copiers</span>
            </>
          ) : (
            <>
              <span className="font-medium text-brand-cyan">{multisportCopy.heroRibbonLabel}</span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
              <span className="font-medium text-brand-cyan">
                ${(mockPlatformStats.totalVolume / 1000).toFixed(0)}K+ Volume
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
              <span className="font-medium text-brand-cyan">{mockPlatformStats.activeTraders} Traders</span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
              <span className="font-medium text-brand-cyan">{mockPlatformStats.totalCopiers} Copiers</span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block" />
              <span className="font-medium text-brand-cyan">{mockPlatformStats.marketsResolved} Resolved</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
