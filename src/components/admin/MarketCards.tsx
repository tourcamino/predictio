import { TrendingUp, CheckCircle, Clock } from "lucide-react";

interface MarketCardsProps {
  markets: Array<{
    id: string;
    event: string;
    sport: string;
    league: string;
    volume: number;
    timeToClose: number;
    percentSplit: Record<string, number>;
    score: number;
    contentGenerated?: boolean;
    postedToX?: boolean;
    postedToTelegram?: boolean;
    repliesSent?: number;
  }>;
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(2)}M`;
  }
  return `$${(volume / 1000).toFixed(1)}K`;
}

function formatTimeToClose(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
  return `${Math.floor(seconds / 86400)}d`;
}

export function MarketCards({ markets }: MarketCardsProps) {
  if (markets.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-gray-400 font-mono text-sm">No markets selected yet. Run a cycle to populate.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {markets.map((market, index) => {
        const splits = Object.values(market.percentSplit);
        
        return (
          <div
            key={market.id}
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-green/20 border border-brand-green/30 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} className="text-brand-green" />
                </div>
                <div>
                  <div className="text-xs font-mono text-gray-400">#{index + 1}</div>
                  <div className="text-sm font-bold font-mono text-brand-green">
                    SCORE: {market.score.toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="px-2 py-1 bg-white/5 rounded text-xs font-mono text-gray-400">
                {market.sport}
              </div>
            </div>

            {/* Event details */}
            <div className="mb-4">
              <h3 className="text-base font-syne font-bold text-white mb-1">
                {market.event}
              </h3>
              <p className="text-xs font-mono text-gray-400">{market.league}</p>
            </div>

            {/* Stats */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">Volume:</span>
                <span className="text-white font-bold font-mono">{formatVolume(market.volume)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">Closes:</span>
                <span className="text-white font-bold font-mono flex items-center gap-1">
                  <Clock size={12} />
                  {formatTimeToClose(market.timeToClose)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">Split:</span>
                <span className="text-white font-bold font-mono">{splits.join(" / ")}</span>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">Content:</span>
                {market.contentGenerated ? (
                  <span className="flex items-center gap-1 text-brand-green font-mono">
                    <CheckCircle size={12} />
                    Generated
                  </span>
                ) : (
                  <span className="text-gray-500 font-mono">Pending</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">Posted:</span>
                <div className="flex items-center gap-2">
                  {market.postedToX && (
                    <span className="flex items-center gap-1 text-cyan-400 font-mono">
                      <CheckCircle size={12} />
                      X
                    </span>
                  )}
                  {market.postedToTelegram && (
                    <span className="flex items-center gap-1 text-blue-400 font-mono">
                      <CheckCircle size={12} />
                      TG
                    </span>
                  )}
                  {!market.postedToX && !market.postedToTelegram && (
                    <span className="text-gray-500 font-mono">—</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">Replies:</span>
                <span className="text-white font-bold font-mono">
                  {market.repliesSent || 0} sent
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
