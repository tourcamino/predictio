import { TrendingUp, Users, Clock, BarChart3 } from 'lucide-react';
import { Market } from '~/data/mockMarkets';

interface MarketStatsBarProps {
  market: Market;
}

export function MarketStatsBar({ market }: MarketStatsBarProps) {
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toLocaleString()}`;
  };

  const predictionCount = market.predictions ?? 0;
  const pool = market.liquidity?.totalPool;
  const trades24h = market.liquidity?.trades24h;

  const stats = [
    {
      icon: BarChart3,
      label: 'Total volume',
      value: market.volume > 0 ? formatVolume(market.volume) : '—',
    },
    {
      icon: TrendingUp,
      label: 'Predictions',
      value: predictionCount > 0 ? predictionCount.toLocaleString() : '—',
    },
    {
      icon: Users,
      label: 'AMM pool',
      value: pool != null && pool > 0 ? formatVolume(pool) : '—',
    },
    {
      icon: Clock,
      label: '24h trades',
      value: trades24h != null ? trades24h.toLocaleString() : '—',
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-6">
      <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
        Market participation (real aggregates)
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-black/20 p-4 transition-colors hover:border-brand-green/20"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-brand-cyan" />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="font-mono text-lg font-bold text-white">{stat.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
