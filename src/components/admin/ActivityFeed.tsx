import { useState, useEffect } from 'react';
import { ActivityFeedItem, generateActivityItem, initialActivityFeed } from '~/data/mockAdmin';
import { useWebSocket } from '~/hooks/useWebSocket';

const typeColors = {
  prediction: 'text-green-500',
  resolution: 'text-cyan-500',
  'new-user': 'text-yellow-500',
  'market-created': 'text-blue-500',
  'large-bet': 'text-red-500',
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>(initialActivityFeed);
  const { messages, connected } = useWebSocket('admin');

  // Convert WebSocket messages to activity items
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.event === 'large_bet' || msg.event === 'resolve_needed' || msg.event === 'risk_alert') {
        const newItem: ActivityFeedItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: msg.event === 'large_bet' ? 'large-bet' : 'prediction',
          message: msg.data.message || JSON.stringify(msg.data),
          timestamp: new Date(msg.timestamp || Date.now()),
        };
        setItems((prev) => [newItem, ...prev].slice(0, 20));
      }
    });
  }, [messages]);

  // Keep mock generator for demo
  useEffect(() => {
    const interval = setInterval(() => {
      if (!connected) {
        const newItem = generateActivityItem();
        setItems((prev) => [newItem, ...prev].slice(0, 20));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connected]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-syne font-bold">Live Activity Feed</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-green' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-500 font-mono">
            {connected ? 'Live' : 'Mock'}
          </span>
        </div>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`
              flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5
              hover:border-white/10 transition-all
              ${index === 0 ? 'animate-slide-down' : ''}
            `}
          >
            <div className={`text-xl ${typeColors[item.type]}`}>●</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 font-mono">
                  {formatTimeAgo(item.timestamp)}
                </span>
                {item.type === 'large-bet' && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-xs font-bold text-red-500">
                    ⚠️ ALERT
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 font-mono leading-relaxed">
                {item.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
