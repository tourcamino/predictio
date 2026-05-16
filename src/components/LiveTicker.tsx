import { useLayoutEffect, useRef, useState } from 'react';
import { useScrollDirection } from '~/hooks/useScrollDirection';
import { isFootballFocusEnabled } from '~/config/footballFocus';
import { useTopChromeManaged } from '~/components/TopChromeContext';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import type { LiveFeedItemDto } from '~/server/trpc/procedures/getLiveActivityFeed';

/** ~28px/s — readable on desktop; duration scales with content width. */
const TICKER_PX_PER_SECOND = 28;
const TICKER_MIN_DURATION_S = 120;
const TICKER_MAX_DURATION_S = 420;

export function LiveTicker() {
  const isManaged = useTopChromeManaged();
  if (isManaged) return null;
  return <LiveTickerInner />;
}

export function LiveTickerInner() {
  const trpc = useTRPC();
  const { scrollDirection, isAtTop } = useScrollDirection();
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollDurationSec, setScrollDurationSec] = useState(TICKER_MIN_DURATION_S);

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

  const tickerItems: LiveFeedItemDto[] = displayItems;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || tickerItems.length === 0) return;

    const measure = () => {
      const loopWidth = el.scrollWidth / 2;
      if (loopWidth <= 0) return;
      const sec = Math.min(
        TICKER_MAX_DURATION_S,
        Math.max(TICKER_MIN_DURATION_S, loopWidth / TICKER_PX_PER_SECOND),
      );
      setScrollDurationSec(sec);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tickerItems]);

  if (tickerItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-white/5 border-b border-white/10 overflow-hidden relative transition-all duration-300 ${
        shouldHideTicker ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="ticker-wrapper">
        <div
          ref={contentRef}
          className="ticker-content"
          style={{ animationDuration: `${scrollDurationSec}s` }}
        >
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
