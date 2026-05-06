import { useEffect, useState } from 'react';
import { useScrollDirection } from '~/hooks/useScrollDirection';
import { isFootballFocusEnabled } from '~/config/footballFocus';

interface TickerItem {
  id: string;
  type: 'prediction' | 'resolved' | 'new_market';
  icon: string;
  text: string;
  color: string;
}

const mockTickerItems: TickerItem[] = [
  { id: '1', type: 'prediction', icon: '⚽', text: '0x7f3a... predicted Real Madrid Win +$500', color: 'text-brand-green' },
  { id: '2', type: 'prediction', icon: '🥊', text: '0x2c1d... predicted Gaethje +$200', color: 'text-brand-green' },
  { id: '3', type: 'new_market', icon: '💰', text: 'Vault: $500 | Markets: 23', color: 'text-brand-cyan' },
  { id: '4', type: 'prediction', icon: '🏏', text: '0x9b1c... predicted India +$1,200', color: 'text-brand-green' },
  { id: '5', type: 'resolved', icon: '✅', text: 'UFC 310 resolved — Poirier wins — 823 paid out', color: 'text-brand-cyan' },
  { id: '6', type: 'new_market', icon: '🔥', text: 'New market: Lakers vs Celtics — $12,400 volume', color: 'text-yellow-400' },
  { id: '7', type: 'prediction', icon: '🏀', text: '0x4e8f... predicted Lakers Win +$350', color: 'text-brand-green' },
  { id: '8', type: 'new_market', icon: '💰', text: 'Vault: $500 | Markets: 23', color: 'text-brand-cyan' },
  { id: '9', type: 'prediction', icon: '🎾', text: '0x1a2b... predicted Djokovic +$800', color: 'text-brand-green' },
  { id: '10', type: 'resolved', icon: '✅', text: 'Premier League resolved — Man City wins — 1,234 paid out', color: 'text-brand-cyan' },
  { id: '11', type: 'new_market', icon: '🔥', text: 'New market: Real Madrid vs Barcelona — $24,800 volume', color: 'text-yellow-400' },
  { id: '12', type: 'prediction', icon: '🏎️', text: '0x5c9d... predicted Verstappen +$600', color: 'text-brand-green' },
];

export function LiveTicker() {
  const [items] = useState(mockTickerItems);
  const { scrollDirection, isAtTop } = useScrollDirection();
  
  // Calculate if ticker should be visible
  const shouldHideTicker = scrollDirection === 'down' && !isAtTop;

  // Filter items based on football focus mode
  const displayItems = isFootballFocusEnabled() 
    ? items.filter(item => item.icon === '⚽' || item.type === 'resolved' || item.type === 'new_market')
    : items;

  return (
    <div className={`bg-white/5 border-b border-white/10 overflow-hidden relative z-30 transition-all duration-300 ${
      shouldHideTicker ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
    }`}>
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {/* Duplicate items for seamless loop */}
          {[...displayItems, ...displayItems].map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="ticker-item inline-flex items-center gap-2 px-6 py-2.5 font-mono text-sm"
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
