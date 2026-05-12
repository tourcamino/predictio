import { useScrollDirection } from '~/hooks/useScrollDirection';
import { isFootballFocusEnabled } from '~/config/footballFocus';
import { useTopChromeManaged } from '~/components/TopChromeContext';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import type { LiveFeedItemDto } from '~/server/trpc/procedures/getLiveActivityFeed';

/** Shown when API returns no rows (or football filter clears all) so the strip never disappears. */
const LIVE_TICKER_FALLBACK_ITEMS: LiveFeedItemDto[] = [
  {
    id: 'fallback-cryptotifoso',
    type: 'demo',
    icon: '🔥',
    text: 'CryptoTifoso ha tradato Napoli WIN +$150',
    color: 'text-brand-green',
    isFootball: true,
    at: Date.now(),
  },
  {
    id: 'fallback-euroanalyst',
    type: 'demo',
    icon: '⚽',
    text: 'EuroAnalyst ha tradato Lazio WIN +$200',
    color: 'text-brand-cyan',
    isFootball: true,
    at: Date.now() - 1,
  },
  {
    id: 'fallback-serieamaster',
    type: 'demo',
    icon: '💰',
    text: 'SerieAMaster ha tradato Inter WIN +$300',
    color: 'text-yellow-400',
    isFootball: true,
    at: Date.now() - 2,
  },
];

export function LiveTicker() {
  const isManaged = useTopChromeManaged();
  if (isManaged) return null;
  return <LiveTickerInner />;
}

export function LiveTickerInner() {
  const trpc = useTRPC();
  const { scrollDirection, isAtTop } = useScrollDirection();

  const feedQuery = useQuery({
    ...trpc.getLiveActivityFeed.queryOptions({}, {
      staleTime: 40_000,
      gcTime: 120_000,
      refetchInterval: 75_000,
    }),
  });

  const shouldHideTicker = scrollDirection === 'down' && !isAtTop;

  const rawItems = feedQuery.data?.items ?? [];

  /** Server already balances sports via `applyNonFootballCap`. If football-only filter leaves almost nothing, show full feed so the strip reflects real platform activity. */
  const footballOnly = isFootballFocusEnabled()
    ? rawItems.filter((item) => item.isFootball)
    : rawItems;
  const displayItems =
    footballOnly.length >= 3 ? footballOnly : rawItems.length > 0 ? rawItems : footballOnly;

  const tickerItems =
    displayItems.length > 0 ? displayItems : LIVE_TICKER_FALLBACK_ITEMS;

  return (
    <div
      className={`bg-white/5 border-b border-white/10 overflow-hidden relative transition-all duration-300 ${
        shouldHideTicker ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="ticker-item inline-flex items-center gap-2 px-6 h-10 font-mono text-sm"
            >
              <span className="text-lg">{item.icon}</span>
              <span className={item.color}>{item.text}</span>
              <span className="text-gray-600 mx-2">·</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
