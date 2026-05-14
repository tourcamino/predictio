import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTRPCClient } from '~/trpc/react';
import type { MarketLifecycleStatus } from '~/utils/marketLifecycle';

export type AiMarketSnapshot = {
  marketId: string;
  teamA: string;
  teamB: string;
  league: string;
  sport: string;
  question?: string;
  yesPrice: number;
  noPrice: number;
  volume24h?: number;
  status?: string;
  lifecycle?: MarketLifecycleStatus;
};

interface AIInsightBadgeProps {
  sport: string;
  compact?: boolean;
  /** When set (e.g. market detail), generates a match-coherent insight via OpenRouter. */
  marketSnapshot?: AiMarketSnapshot | null;
}

const footballInsights = [
  'Sharp liquidity moves can tighten spreads — watch implied % vs your own read of form and fixtures.',
  'Home pitch and rest matter in tight leagues; compare that to what the YES price embeds before sizing up.',
  'Late news moves markets fast; confirm anything material in trusted sources — prices are not prophecies.',
];

const basketballInsights = [
  'Back-to-backs and travel show up in efficiency stats; check whether the line already prices them in.',
  'Injury reports shift probabilities quickly — implied % is a snapshot of the crowd, not a diagnosis.',
];

const mmaInsights = [
  'Styles make fights — contrast grappling vs striking paths before leaning on the implied favorite.',
  'Small liquidity pools can exaggerate swings; treat wide moves as volatility, not certainty.',
];

const cricketInsights = [
  'Venue and surface tilt conditions — decide whether prices already bake that in.',
  'Weather breaks can flip sessions; markets compress uncertainty into one YES/NO slice.',
];

const defaultInsights = [
  'Implied probability prices consensus and incentives — pair it with your own research.',
  'Higher volume usually means tighter discovery; thin books can gap around news.',
];

const insightsBySport: Record<string, string[]> = {
  football: footballInsights,
  basketball: basketballInsights,
  mma: mmaInsights,
  cricket: cricketInsights,
};

export function AIInsightBadge({
  sport,
  compact = false,
  marketSnapshot,
}: AIInsightBadgeProps) {
  const trpcClient = useTRPCClient();
  const fallbackPool = insightsBySport[sport] ?? defaultInsights;
  const [rotating, setRotating] = useState(fallbackPool[0]);

  const insightReady =
    Boolean(marketSnapshot?.marketId) &&
    Boolean(marketSnapshot?.teamA) &&
    Boolean(marketSnapshot?.teamB);

  const insightFingerprint = marketSnapshot
    ? [
        marketSnapshot.marketId,
        Math.round(marketSnapshot.yesPrice * 1000),
        Math.round(marketSnapshot.noPrice * 1000),
        Math.round((marketSnapshot.volume24h ?? 0) / 100),
        marketSnapshot.lifecycle ?? "",
        marketSnapshot.status ?? "",
      ].join(":")
    : "idle";

  const insightQuery = useQuery({
    queryKey: ["marketAiInsight", insightFingerprint],
    enabled: insightReady && !!marketSnapshot,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: () =>
      trpcClient.marketAiInsight.query({
        snapshot: {
          teamA: marketSnapshot!.teamA,
          teamB: marketSnapshot!.teamB,
          league: marketSnapshot!.league,
          sport: marketSnapshot!.sport,
          question: marketSnapshot!.question,
          yesPrice: marketSnapshot!.yesPrice,
          noPrice: marketSnapshot!.noPrice,
          volume24h: marketSnapshot!.volume24h,
          status: marketSnapshot!.status,
          lifecycle: marketSnapshot!.lifecycle,
        },
      }),
  });

  useEffect(() => {
    if (marketSnapshot) return;
    const interval = setInterval(() => {
      setRotating(fallbackPool[Math.floor(Math.random() * fallbackPool.length)]);
    }, 15000);
    return () => clearInterval(interval);
  }, [fallbackPool, marketSnapshot]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-cyan/10 border border-brand-cyan/30 rounded text-xs">
        <span className="text-brand-cyan">🤖</span>
        <span className="text-brand-cyan font-semibold">AI INSIGHT</span>
      </div>
    );
  }

  const showLoader =
    Boolean(marketSnapshot) &&
    insightQuery.isFetching &&
    !insightQuery.data?.insight;

  const resolvedInsight = marketSnapshot
    ? insightQuery.data?.insight
    : rotating;

  const displayBody = marketSnapshot
    ? showLoader
      ? 'Generating context-aware insight…'
      : resolvedInsight ||
        'Insight temporarily unavailable — prices and markets still load normally.'
    : rotating;

  return (
    <div className="bg-brand-cyan/5 border border-brand-cyan/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-brand-cyan text-lg">🤖</span>
        <span className="text-brand-cyan font-semibold text-sm">AI INSIGHT</span>
        {showLoader && (
          <Loader2 className="w-4 h-4 animate-spin text-brand-cyan ml-auto" aria-hidden />
        )}
      </div>
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
        {displayBody}
      </p>
      {marketSnapshot && (
        <p className="text-[11px] text-gray-500 mt-3 leading-snug">
          AI-generated from match context and live prices — not financial advice; verify fees and rules on Predictio.
        </p>
      )}
    </div>
  );
}
