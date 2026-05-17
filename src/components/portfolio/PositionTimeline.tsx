import { CheckCircle, XCircle, Circle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '~/utils/marketUtils';
import { parseApiDate, formatApiDateTime } from '~/utils/parseApiDate';

interface PositionEvent {
  id: string;
  type: 'opened' | 'closed';
  timestamp: Date;
  marketId: string;
  marketEvent: string;
  sport: string;
  outcome: string;
  amount: number;
  shares?: number | null;
  pnl?: number | null;
}

interface PositionTimelineProps {
  events: PositionEvent[];
}

export function PositionTimeline({ events }: PositionTimelineProps) {
  const timelineEvents = events.map((e) => ({
    ...e,
    timestamp: parseApiDate(e.timestamp) ?? new Date(0),
  }));

  if (timelineEvents.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="font-syne font-bold text-xl mb-4">Position Timeline</h2>
        <div className="text-center py-12 text-gray-400">
          No position history yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-xl mb-4">Position Timeline</h2>
      
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {timelineEvents.map((event, index) => {
          const isOpened = event.type === 'opened';
          const isClosed = event.type === 'closed';
          const isWin = isClosed && (event.pnl || 0) > 0;
          const isLoss = isClosed && (event.pnl || 0) < 0;

          return (
            <div key={`${event.id}-${index}`} className="relative pl-8">
              {/* Timeline connector */}
              {index < timelineEvents.length - 1 && (
                <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-white/10" />
              )}

              {/* Timeline dot */}
              <div className="absolute left-0 top-1">
                {isOpened && (
                  <Circle className="w-5 h-5 text-brand-cyan fill-brand-cyan" />
                )}
                {isClosed && isWin && (
                  <CheckCircle className="w-5 h-5 text-brand-green fill-brand-green" />
                )}
                {isClosed && isLoss && (
                  <XCircle className="w-5 h-5 text-red-500 fill-red-500" />
                )}
              </div>

              {/* Event content */}
              <div className={`bg-white/5 border rounded-lg p-4 ${
                isOpened ? 'border-brand-cyan/30' :
                isWin ? 'border-brand-green/30' :
                isLoss ? 'border-red-500/30' :
                'border-white/10'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono">
                        {formatApiDateTime(event.timestamp)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        isOpened ? 'bg-brand-cyan/20 text-brand-cyan' :
                        isWin ? 'bg-brand-green/20 text-brand-green' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {isOpened ? 'OPENED' : isWin ? 'WON' : 'LOST'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{event.marketEvent}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="uppercase">{event.sport}</span>
                      <span>•</span>
                      <span className={`font-semibold ${
                        event.outcome.toUpperCase() === 'YES' ? 'text-brand-green' : 'text-red-500'
                      }`}>
                        {event.outcome.toUpperCase()}
                      </span>
                      {event.shares && (
                        <>
                          <span>•</span>
                          <span>{event.shares.toFixed(1)} shares</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      {formatCurrency(event.amount)}
                    </div>
                    {isClosed && event.pnl !== null && event.pnl !== undefined && (
                      <div className={`flex items-center gap-1 mt-1 ${
                        isWin ? 'text-brand-green' : 'text-red-500'
                      }`}>
                        {isWin ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="text-sm font-mono font-bold">
                          {event.pnl >= 0 ? '+' : ''}{formatCurrency(event.pnl)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
