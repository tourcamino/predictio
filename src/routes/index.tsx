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
        title="Predictio.live — European premium prediction markets"
        description="Curated multisport prediction intelligence on Base — European premium lanes, editorial catalogue, and calm conviction tooling."
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      <OGImagePreloader />
      <Hero />
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

