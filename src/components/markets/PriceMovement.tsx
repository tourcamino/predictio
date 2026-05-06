import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceMovementProps {
  percentA: number;
  className?: string;
}

export function PriceMovement({ percentA, className = '' }: PriceMovementProps) {
  // Calculate trend based on percentage
  // In a real app, this would be based on historical data
  const getTrend = () => {
    // Simulate trend: higher percentages tend to be rising, lower falling
    const seed = percentA * 1.234; // Create deterministic "randomness"
    const trendValue = (Math.sin(seed) * 10) + (percentA - 50) * 0.2;
    
    if (Math.abs(trendValue) < 1) return { direction: 'flat', value: 0 };
    if (trendValue > 0) return { direction: 'up', value: Math.abs(trendValue) };
    return { direction: 'down', value: Math.abs(trendValue) };
  };

  const trend = getTrend();

  if (trend.direction === 'flat') {
    return (
      <div className={`flex items-center gap-0.5 flex-shrink-0 ${className}`}>
        <Minus className="w-3 h-3 text-gray-500 flex-shrink-0" />
        <span className="font-mono text-xs text-gray-500 whitespace-nowrap">0.0%</span>
      </div>
    );
  }

  if (trend.direction === 'up') {
    return (
      <div className={`flex items-center gap-0.5 flex-shrink-0 ${className}`}>
        <TrendingUp className="w-3 h-3 text-brand-green flex-shrink-0" />
        <span className="font-mono text-xs text-brand-green whitespace-nowrap">
          +{trend.value.toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 flex-shrink-0 ${className}`}>
      <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />
      <span className="font-mono text-xs text-red-500 whitespace-nowrap">
        -{trend.value.toFixed(1)}%
      </span>
    </div>
  );
}
