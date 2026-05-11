import { useScrollDirection } from '~/hooks/useScrollDirection';
import { isFootballFocusEnabled } from '~/config/footballFocus';
import { useTopChromeManaged } from '~/components/TopChromeContext';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';

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

  const displayItems = isFootballFocusEnabled()
    ? rawItems.filter((item) => item.isFootball)
    : rawItems;

  if (!feedQuery.isLoading && displayItems.length === 0) {
    return null;
  }

  if (feedQuery.isLoading && displayItems.length === 0) {
    return (
      <div
        className={`bg-white/5 border-b border-white/10 overflow-hidden relative transition-all duration-300 ${
          shouldHideTicker ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="h-10 flex items-center px-4">
          <div className="h-2 w-40 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white/5 border-b border-white/10 overflow-hidden relative transition-all duration-300 ${
        shouldHideTicker ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {[...displayItems, ...displayItems].map((item, index) => (
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
