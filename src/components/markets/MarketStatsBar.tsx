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

  const getRelativeTime = (date: Date) => {
    const now = Date.now();
    const created = date.getTime();
    const diff = now - created;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  // Mock market created date (4 days ago)
  const marketCreatedDate = new Date(market.closesAt.getTime() - 4 * 24 * 60 * 60 * 1000);

  const predictionCount = market.predictions ?? 0;
  // Mock data for increases
  const volumeIncrease = Math.floor(market.volume * 0.1);
  const predictionsIncrease = Math.floor(predictionCount * 0.027);
  const uniquePredictors = Math.floor(predictionCount * 0.26);

  const stats = [
    {
      icon: BarChart3,
      label: 'Total Volume',
      value: formatVolume(market.volume) + ' USDC',
      change: `↑ ${formatVolume(volumeIncrease)} last hour`,
      changeColor: 'text-brand-green',
    },
    {
      icon: TrendingUp,
      label: 'Total Predictions',
      value: predictionCount.toLocaleString(),
      change: `↑ ${predictionsIncrease} last hour`,
      changeColor: 'text-brand-green',
    },
    {
      icon: Users,
      label: 'Unique Predictors',
      value: uniquePredictors.toLocaleString() + ' wallets',
      change: null,
      changeColor: '',
    },
    {
      icon: Clock,
      label: 'Market Created',
      value: marketCreatedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      change: getRelativeTime(marketCreatedDate),
      changeColor: 'text-gray-500',
    },
  ];

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="p-2 bg-brand-green/10 rounded-lg">
              <stat.icon className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
              <div className="font-mono font-bold text-lg mb-1">{stat.value}</div>
              {stat.change && (
                <div className={`text-xs font-mono ${stat.changeColor}`}>{stat.change}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
