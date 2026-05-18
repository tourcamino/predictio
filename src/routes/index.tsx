import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Hero } from "~/components/Hero";
import { SportsGrid } from "~/components/SportsGrid";
import { HowItWorks } from "~/components/HowItWorks";
import { LiveMarkets } from "~/components/LiveMarkets";
import { WhyPredictio } from "~/components/WhyPredictio";
import { CTASection } from "~/components/CTASection";
import { OGImagePreloader } from "~/components/OGImagePreloader";
import { MetaTags } from "~/components/MetaTags";
import { TrustSection } from "~/components/TrustSection";
import { isFootballFocusEnabled, FOOTBALL_FOCUS_CONFIG } from '~/config/footballFocus';
import { ComingSoonSports } from '~/components/ComingSoonSports';
import { GlobalProtocolMarketPulse } from '~/components/protocol/GlobalProtocolMarketPulse';
import { ProtocolFlowFeed } from '~/components/protocol/ProtocolFlowFeed';

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  // Add canonical link for SEO
  useEffect(() => {
    const canonicalUrl = 'https://predictio.live/';
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    
    link.setAttribute('href', canonicalUrl);
    
    // Cleanup function to remove on unmount if needed
    return () => {
      // Keep the canonical link even on unmount since it's the homepage
    };
  }, []);

  return (
    <div className="min-h-screen">
      <MetaTags
        title="Predictio.live — DeFi Sports Prediction Markets on Base"
        description="Trade YES/NO tokens on Champions League, Serie A, NBA and more. Powered by Base blockchain."
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      <OGImagePreloader />
      <Hero />
      <section className="border-b border-white/10 bg-black/40 px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <GlobalProtocolMarketPulse variant="compact" />
          <ProtocolFlowFeed limit={6} />
        </div>
      </section>
      <LiveMarkets />
      <HowItWorks />
      <WhyPredictio />
      <TrustSection />
      {isFootballFocusEnabled() && FOOTBALL_FOCUS_CONFIG.SHOW_COMING_SOON_SECTION && (
        <ComingSoonSports />
      )}
      {!isFootballFocusEnabled() && <SportsGrid />}
      <CTASection />
    </div>
  );
}

