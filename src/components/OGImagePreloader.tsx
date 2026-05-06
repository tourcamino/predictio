import { useEffect } from 'react';
import { useTRPCClient } from '~/trpc/react';
import { getFeaturedMarkets } from '~/data/mockMarkets';

/**
 * Component that pre-generates OG images for featured markets in the background.
 * This ensures that when users share links to featured markets, the preview cards
 * are already available and load instantly on social media platforms.
 */
export function OGImagePreloader() {
  const client = useTRPCClient();
  const featuredMarkets = getFeaturedMarkets();

  // Pre-generate OG images for all featured markets
  useEffect(() => {
    // Only preload if we have valid featured markets
    if (!featuredMarkets || featuredMarkets.length === 0) {
      return;
    }

    // Stagger the requests to avoid overwhelming the server
    featuredMarkets.forEach((market, index) => {
      // Validate market has an ID before attempting to generate
      if (!market || !market.id) {
        console.warn('[OGImagePreloader] Skipping market without valid ID:', market);
        return;
      }

      setTimeout(() => {
        client.generateMarketOGImage
          .query({ marketId: market.id })
          .then(() => {
            console.log(`[OGImagePreloader] Generated OG image for market ${market.id}`);
          })
          .catch((error: unknown) => {
            // Silently fail - this is just a background optimization
            console.warn(`[OGImagePreloader] Failed to generate OG image for market ${market.id}:`, error);
          });
      }, index * 1000); // Stagger by 1 second to be more conservative
    });
  }, [client, featuredMarkets]);

  // This component doesn't render anything
  return null;
}
