import { TrendingUp, Users, BarChart3 } from 'lucide-react';
import { Market } from '~/data/mockMarkets';
import { formatCurrency } from '~/utils/marketUtils';

interface SocialProofProps {
  market: Market;
  compact?: boolean;
}

export function SocialProof({ market, compact = false }: SocialProofProps) {
  if (compact) {
    // Lightweight version for cards
    return (
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-semibold">{formatCurrency(market.volume, true)} traded</span>
        <span>•</span>
        <span>{market.traders.toLocaleString()} traders</span>
      </div>
    );
  }

  // Full version for market detail pages
  const stats = [
    {
      icon: BarChart3,
      label: 'traded',
      value: formatCurrency(market.volume, true),
      color: 'text-brand-green',
    },
    {
      icon: TrendingUp,
      label: 'predictions',
      value: (market.predictions || market.traders * 3).toLocaleString(),
      color: 'text-cyan-400',
    },
    {
      icon: Users,
      label: 'traders',
      value: market.traders.toLocaleString(),
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 py-4 sm:py-6">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2 sm:gap-3">
          <div className={`p-2 bg-white/5 rounded-lg ${stat.color}`}>
            <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className={`font-mono font-bold text-xl sm:text-2xl ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
