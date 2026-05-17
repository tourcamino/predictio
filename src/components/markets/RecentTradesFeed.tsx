import { useEffect, useState, useRef } from 'react';
import { Market } from '~/data/mockMarkets';
import { useWebSocket } from '~/hooks/useWebSocket';

interface RecentTradesFeedProps {
  market: Market;
}

interface Trade {
  id: string;
  wallet: string;
  outcome: string;
  outcomeLabel: string;
  amount: number;
  timestamp: Date;
}

export function RecentTradesFeed({ market }: RecentTradesFeedProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const { messages, connected } = useWebSocket('markets');

  useEffect(() => {
    setTrades([]);
  }, [market.id]);

  const lastProcessedTimestamp = useRef<number>(0);

  useEffect(() => {
    const newMessages = messages.filter(
      (msg) => (msg.timestamp || 0) > lastProcessedTimestamp.current
    );

    if (newMessages.length === 0) return;

    const latestTimestamp = Math.max(
      ...newMessages.map((msg) => msg.timestamp || 0)
    );
    lastProcessedTimestamp.current = latestTimestamp;

    newMessages.forEach((msg) => {
      if (msg.event === 'trade' && msg.data.marketId === market.id) {
        const newTrade: Trade = {
          id: `ws-${msg.data.timestamp}-${msg.data.wallet}`,
          wallet: msg.data.wallet,
          outcome: msg.data.outcome,
          outcomeLabel:
            msg.data.outcome === 'teamA'
              ? `${market.teamA} Win`
              : msg.data.outcome === 'draw'
              ? 'Draw'
              : `${market.teamB} Win`,
          amount: msg.data.amount,
          timestamp: new Date(msg.data.timestamp),
        };
        setTrades((prev) => [newTrade, ...prev].slice(0, 6));
      }
    });
  }, [messages, market.id, market.teamA, market.teamB]);

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getOutcomeColor = (outcome: string) => {
    if (outcome === 'teamA') return 'text-brand-green';
    if (outcome === 'teamB') return 'text-cyan-400';
    return 'text-gray-400';
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-syne font-bold text-xl">Recent Predictions</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-green' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-500 font-mono">
            {connected ? 'Live feed' : 'Awaiting protocol activity'}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {trades.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            {connected
              ? 'No trades in this session yet — activity appears when the live feed publishes real fills.'
              : 'Live feed offline. See Protocol activity below for Postgres ledger events.'}
          </p>
        ) : null}
        {trades.map((trade, index) => (
          <div
            key={trade.id}
            className={`flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 ${
              index === 0 ? 'animate-slide-down' : ''
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-mono text-sm text-gray-400 truncate">
                {trade.wallet}
              </span>
              <span className="text-gray-600">→</span>
              <span className={`font-semibold text-sm ${getOutcomeColor(trade.outcome)} truncate`}>
                {trade.outcomeLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 ml-3">
              <span className="font-mono text-sm text-brand-green font-semibold whitespace-nowrap">
                +${trade.amount.toLocaleString()}
              </span>
              <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
                {getRelativeTime(trade.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
