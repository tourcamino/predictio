import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';
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
  /** Omit or 0 when no real paper volume — server will not send to the model. */
  volume24h?: number;
  status?: string;
  lifecycle?: MarketLifecycleStatus;
  importanceScore?: number;
  curatedRank?: number;
};

interface AIInsightBadgeProps {
  sport: string;
  compact?: boolean;
  /** When set (e.g. market detail), generates a match-coherent insight via OpenRouter. */
  marketSnapshot?: AiMarketSnapshot | null;
}

const footballInsights = [
  'Vault-backed curated slot — compare implied YES/NO % to your own read of form and fixtures before sizing.',
  'Home pitch and rest matter in tight leagues; check whether the price already embeds that narrative.',
  'Prices are a snapshot of positioning, not a forecast — confirm kickoff lock and rules in-app.',
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
  'Implied probability prices consensus — pair it with your own research on the matchup.',
  'Pre-testnet paper markets: no live trader or volume claims until real activity exists.',
];

const insightsBySport: Record<string, string[]> = {
  football: footballInsights,
  basketball: basketballInsights,
  mma: mmaInsights,
  cricket: cricketInsights,
};

const mutedNoteClass =
  'text-xs text-gray-400 border border-white/10 bg-white/[0.02] rounded-lg';

export function AIInsightBadge({
  sport,
  compact = false,
  marketSnapshot,
}: AIInsightBadgeProps) {
  const trpcClient = useTRPCClient();
  const fallbackPool = insightsBySport[sport] ?? defaultInsights;
  const [rotating, setRotating] = useState(fallbackPool[0]);
  const [expanded, setExpanded] = useState(false);

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
        marketSnapshot.lifecycle ?? '',
        marketSnapshot.status ?? '',
      ].join(':')
    : 'idle';

  const insightQuery = useQuery({
    queryKey: ['marketAiInsight', insightFingerprint],
    enabled: insightReady && !!marketSnapshot,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: () =>
      trpcClient.marketAiInsight.query({
        snapshot: {
          marketId: marketSnapshot!.marketId,
          teamA: marketSnapshot!.teamA,
          teamB: marketSnapshot!.teamB,
          league: marketSnapshot!.league,
          sport: marketSnapshot!.sport,
          question: marketSnapshot!.question,
          yesPrice: marketSnapshot!.yesPrice,
          noPrice: marketSnapshot!.noPrice,
          volume24h:
            marketSnapshot!.volume24h != null && marketSnapshot!.volume24h > 0
              ? marketSnapshot!.volume24h
              : undefined,
          status: marketSnapshot!.status,
          lifecycle: marketSnapshot!.lifecycle,
          importanceScore: marketSnapshot!.importanceScore,
          curatedRank: marketSnapshot!.curatedRank,
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
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${mutedNoteClass}`}>
        <span className="text-brand-cyan/80 font-medium">AI</span>
        <span className="text-gray-500">Context note</span>
      </span>
    );
  }

  const showLoader =
    Boolean(marketSnapshot) && insightQuery.isFetching && !insightQuery.data?.insight;

  const resolvedInsight = marketSnapshot ? insightQuery.data?.insight : rotating;

  const displayBody = marketSnapshot
    ? showLoader
      ? 'Generating context-aware insight…'
      : resolvedInsight ||
        'Insight temporarily unavailable — prices and markets still load normally.'
    : rotating;

  if (marketSnapshot) {
    return (
      <div className={mutedNoteClass}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
          aria-expanded={expanded}
        >
          <span className="text-brand-cyan/90 font-medium">AI insight</span>
          <span className="flex items-center gap-2 text-gray-500">
            {showLoader && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-cyan" aria-hidden />}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </span>
        </button>
        {expanded && (
          <div className="px-3 pb-3 border-t border-white/10">
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap pt-2">
              {displayBody}
            </p>
            <p className="text-[11px] text-gray-500 mt-2 leading-snug">
              AI-generated from match context and prices — not financial advice.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`px-3 py-2 ${mutedNoteClass}`}>
      <p className="text-xs text-gray-400 leading-relaxed">{displayBody}</p>
    </div>
  );
}
