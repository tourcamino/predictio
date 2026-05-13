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

function generateWalletAddress(): string {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 4; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  address += '...';
  for (let i = 0; i < 4; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

function generateMockTrade(market: Market): Trade {
  const outcomes = [
    { id: 'teamA', label: `${market.teamA} Win` },
    ...(market.percentDraw ? [{ id: 'draw', label: 'Draw' }] : []),
    { id: 'teamB', label: `${market.teamB} Win` },
  ];
  
  const oi = Math.floor(Math.random() * outcomes.length);
  const outcome = outcomes[oi];
  const amount = Math.floor(Math.random() * 2000) + 50;

  if (!outcome) {
    return {
      id: `${Date.now()}-${Math.random()}`,
      wallet: generateWalletAddress(),
      outcome: 'teamA',
      outcomeLabel: `${market.teamA} Win`,
      amount,
      timestamp: new Date(),
    };
  }

  return {
    id: `${Date.now()}-${Math.random()}`,
    wallet: generateWalletAddress(),
    outcome: outcome.id,
    outcomeLabel: outcome.label,
    amount,
    timestamp: new Date(),
  };
}

function generateMockTrades(market: Market, count: number): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const trade = generateMockTrade(market);
    trade.timestamp = new Date(now - i * 60000 * Math.random() * 10);
    trades.push(trade);
  }
  
  return trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function RecentTradesFeed({ market }: RecentTradesFeedProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const { messages, connected } = useWebSocket('markets');

  // Generate initial trades
  useEffect(() => {
    const initialTrades = generateMockTrades(market, 6);
    setTrades(initialTrades);
  }, [market]);

  // Track last processed message timestamp to avoid reprocessing
  const lastProcessedTimestamp = useRef<number>(0);

  // Listen for WebSocket trade events
  useEffect(() => {
    // Only process new messages that haven't been seen before
    const newMessages = messages.filter(
      (msg) => (msg.timestamp || 0) > lastProcessedTimestamp.current
    );

    if (newMessages.length === 0) return;

    // Update the last processed timestamp
    const latestTimestamp = Math.max(
      ...newMessages.map((msg) => msg.timestamp || 0)
    );
    lastProcessedTimestamp.current = latestTimestamp;

    // Process new trade messages
    newMessages.forEach((msg) => {
      if (msg.event === 'trade' && msg.data.marketId === market.id) {
        const newTrade: Trade = {
          id: `${Date.now()}-${Math.random()}`,
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
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-syne font-bold text-xl">Recent Predictions</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-green' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500 font-mono">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
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
