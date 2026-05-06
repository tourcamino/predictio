import { Clock, TrendingUp, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Market, SPORT_METADATA } from '~/data/mockMarkets';

interface MarketsSidebarProps {
  markets: Market[];
}

export function MarketsSidebar({ markets }: MarketsSidebarProps) {
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    icon: string;
    text: string;
    time: string;
  }>>([
    { id: '1', icon: '⚽', text: 'Real Madrid Win +$250', time: '3s ago' },
    { id: '2', icon: '🏏', text: 'India +$800', time: '28s ago' },
    { id: '3', icon: '🥊', text: 'Gaethje +$150', time: '1m ago' },
    { id: '4', icon: '🏀', text: 'Lakers Win +$350', time: '2m ago' },
    { id: '5', icon: '🎾', text: 'Djokovic +$600', time: '3m ago' },
    { id: '6', icon: '🏎️', text: 'Verstappen +$400', time: '4m ago' },
    { id: '7', icon: '⚽', text: 'Barcelona Win +$550', time: '5m ago' },
    { id: '8', icon: '🏏', text: 'Australia +$300', time: '6m ago' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const sports = ['⚽', '🏀', '🎾', '🥊', '🏏', '🏎️'];
      const outcomes = ['Win', 'Draw', 'Over', 'Under'];
      const teams = ['Real Madrid', 'Lakers', 'Djokovic', 'Poirier', 'India', 'Verstappen'];
      
      const newItem = {
        id: Date.now().toString(),
        icon: sports[Math.floor(Math.random() * sports.length)],
        text: `${teams[Math.floor(Math.random() * teams.length)]} ${outcomes[Math.floor(Math.random() * outcomes.length)]} +$${Math.floor(Math.random() * 900) + 100}`,
        time: 'Just now',
      };
      
      setRecentActivity((prev) => [newItem, ...prev.slice(0, 7)]);
    }, 6000); // New item every 6 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Top 5 by volume
  const topVolume = [...markets]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  // Top 5 closing soon
  const closingSoon = [...markets]
    .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime())
    .slice(0, 5);

  // Sport distribution
  const sportCounts = markets.reduce((acc, market) => {
    acc[market.sport] = (acc[market.sport] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalMarkets = markets.length;
  const sportDistribution = Object.entries(sportCounts)
    .map(([sport, count]) => ({
      sport,
      count,
      percentage: (count / totalMarkets) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume}`;
  };

  return (
    <div className="hidden lg:block space-y-6">
      {/* Top Volume */}
      <div className="bg-brand-navy border border-white/10 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-brand-green" />
          <h3 className="font-syne font-semibold text-lg">Top Volume 24h</h3>
        </div>
        <div className="space-y-3">
          {topVolume.map((market, index) => (
            <Link
              key={market.id}
              to="/markets/$marketId"
              params={{ marketId: market.id }}
              className="flex items-start gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
            >
              <span className="font-mono text-sm text-gray-500 mt-0.5">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">
                  {market.teamA} vs {market.teamB}
                </div>
                <div className="font-mono text-xs text-brand-green mt-0.5">
                  {formatVolume(market.volume)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Closing Soon */}
      <div className="bg-brand-navy border border-white/10 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-red-500" />
          <h3 className="font-syne font-semibold text-lg">Closing Soon</h3>
        </div>
        <div className="space-y-3">
          {closingSoon.map((market) => {
            const timeUntilClose = market.closesAt.getTime() - new Date().getTime();
            const hoursLeft = Math.floor(timeUntilClose / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeUntilClose % (1000 * 60 * 60)) / (1000 * 60));

            return (
              <Link
                key={market.id}
                to="/markets/$marketId"
                params={{ marketId: market.id }}
                className="block cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
              >
                <div className="text-sm truncate">
                  {market.teamA} vs {market.teamB}
                </div>
                <div className="font-mono text-xs text-red-500 mt-0.5">
                  {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sport Distribution */}
      <div className="bg-brand-navy border border-white/10 rounded-lg p-5">
        <h3 className="font-syne font-semibold text-lg mb-4">Sport Distribution</h3>
        <div className="space-y-3">
          {sportDistribution.map(({ sport, percentage }) => {
            const sportMeta = SPORT_METADATA[sport];
            return (
              <div key={sport}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span>
                    {sportMeta.emoji} {sportMeta.name}
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: sportMeta.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-brand-navy border border-white/10 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-brand-green" />
          <h3 className="font-syne font-semibold text-lg">Recent Activity</h3>
        </div>
        <div className="space-y-2 max-h-80 overflow-hidden">
          {recentActivity.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-2 p-2 bg-white/5 rounded animate-slide-down"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{item.text}</div>
                <div className="text-xs text-gray-500 font-mono">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Activity */}
      <div className="bg-brand-navy border border-white/10 rounded-lg p-5">
        <h3 className="font-syne font-semibold text-lg mb-4">Market Activity</h3>
        <div className="space-y-2 font-mono text-xs text-gray-400">
          <div>{markets.length} markets open</div>
          <div>234 resolved today</div>
          <div className="text-brand-green">$4.2M volume 24h</div>
        </div>
      </div>
    </div>
  );
}
