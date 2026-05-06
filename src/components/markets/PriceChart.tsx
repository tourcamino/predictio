import { useState } from 'react';
import { Market } from '~/data/mockMarkets';

interface PriceChartProps {
  market: Market;
}

type TimeRange = '1H' | '6H' | '24H' | '7D';

export function PriceChart({ market }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');

  const history = market.priceHistory || [];

  // Filter history based on time range
  const getFilteredHistory = () => {
    const now = Date.now();
    const ranges = {
      '1H': 1 * 60 * 60 * 1000,
      '6H': 6 * 60 * 60 * 1000,
      '24H': 24 * 60 * 60 * 1000,
      '7D': 7 * 24 * 60 * 60 * 1000,
    };
    
    const cutoff = now - ranges[timeRange];
    return history.filter(h => h.timestamp.getTime() >= cutoff);
  };

  const filteredHistory = getFilteredHistory();

  // Convert prices to percentages
  const yesPercentages = filteredHistory.map(h => h.yesPrice * 100);
  const noPercentages = filteredHistory.map(h => h.noPrice * 100);

  // Calculate min and max for scaling
  const allPercents = [...yesPercentages, ...noPercentages];
  const minPercent = Math.max(0, Math.min(...allPercents) - 5);
  const maxPercent = Math.min(100, Math.max(...allPercents) + 5);
  const range = maxPercent - minPercent;

  // Generate SVG path for a line
  const generatePath = (data: number[]) => {
    if (data.length === 0) return '';
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(data.length - 1, 1);

    return data
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - minPercent) / range) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Generate area path (includes bottom line)
  const generateAreaPath = (data: number[]) => {
    if (data.length === 0) return '';
    const linePath = generatePath(data);
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(data.length - 1, 1);
    const lastX = (data.length - 1) * stepX;
    
    return `${linePath} L ${lastX} ${height} L 0 ${height} Z`;
  };

  const pathYes = generatePath(yesPercentages);
  const pathNo = generatePath(noPercentages);

  const areaYes = generateAreaPath(yesPercentages);
  const areaNo = generateAreaPath(noPercentages);

  const timeRanges: TimeRange[] = ['1H', '6H', '24H', '7D'];

  const currentYesPercent = market.yesPrice * 100;
  const currentNoPercent = market.noPrice * 100;

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-syne font-bold text-xl">Probability Chart</h2>
        
        {/* Time Range Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm font-semibold rounded transition-all ${
                timeRange === range
                  ? 'bg-brand-green text-brand-bg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Current Probabilities */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand-green rounded-full"></div>
            <span className="text-sm font-semibold">YES</span>
          </div>
          <span className="font-mono text-2xl font-bold text-brand-green">
            {currentYesPercent.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-500"
            style={{ width: `${currentYesPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-semibold">NO</span>
          </div>
          <span className="font-mono text-2xl font-bold text-red-500">
            {currentNoPercent.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${currentNoPercent}%` }}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="relative bg-white/5 rounded-lg p-4" style={{ height: '300px' }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.2"
            />
          ))}

          {/* Area fills */}
          <path d={areaYes} fill="#00FF87" fillOpacity="0.15" />
          <path d={areaNo} fill="#EF4444" fillOpacity="0.15" />

          {/* Lines */}
          <path d={pathYes} fill="none" stroke="#00FF87" strokeWidth="2" />
          <path d={pathNo} fill="none" stroke="#EF4444" strokeWidth="2" />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
          <span>{maxPercent.toFixed(0)}%</span>
          <span>{((maxPercent + minPercent) / 2).toFixed(0)}%</span>
          <span>{minPercent.toFixed(0)}%</span>
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>{timeRange} ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}
