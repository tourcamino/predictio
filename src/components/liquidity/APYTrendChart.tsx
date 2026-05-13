import { useState, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface APYHistoryPoint {
  timestamp: Date;
  apy: number;
  poolSize: number;
  volume24h: number;
}

interface APYTrendChartProps {
  data: APYHistoryPoint[];
  summary: {
    currentAPY: number;
    startAPY: number;
    avgAPY: number;
    maxAPY: number;
    minAPY: number;
    apyChange: number;
    apyChangePct: number;
  };
  timeRange: '7D' | '30D' | '90D' | 'ALL';
  onTimeRangeChange: (range: '7D' | '30D' | '90D' | 'ALL') => void;
  marketName?: string;
}

export function APYTrendChart({
  data,
  summary,
  timeRange,
  onTimeRangeChange,
  marketName,
}: APYTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || data.length === 0) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate which data point is closest to the mouse
    const chartWidth = rect.width;
    const pointSpacing = chartWidth / Math.max(data.length - 1, 1);
    const index = Math.round(x / pointSpacing);
    
    if (index >= 0 && index < data.length) {
      setHoveredIndex(index);
      setMousePosition({ x, y });
    }
  }, [data.length]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="font-syne font-bold text-lg mb-4">APY Trend</h3>
        <div className="text-center py-12 text-gray-400">
          No APY history available
        </div>
      </div>
    );
  }

  const apyValues = data.map(d => d.apy);
  const minAPY = Math.min(...apyValues);
  const maxAPY = Math.max(...apyValues);
  const range = maxAPY - minAPY || 1;
  const buffer = range * 0.1; // Add 10% buffer for better visualization

  // Generate SVG path for the line
  const generatePath = (dataValues: number[]) => {
    if (dataValues.length === 0) return '';
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(dataValues.length - 1, 1);

    return dataValues
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - (minAPY - buffer)) / (range + buffer * 2)) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Generate area path (includes bottom line)
  const generateAreaPath = (dataValues: number[]) => {
    if (dataValues.length === 0) return '';
    const linePath = generatePath(dataValues);
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(dataValues.length - 1, 1);
    const lastX = (dataValues.length - 1) * stepX;
    
    return `${linePath} L ${lastX} ${height} L 0 ${height} Z`;
  };

  const path = generatePath(apyValues);
  const areaPath = generateAreaPath(apyValues);

  const isPositive = summary.apyChange >= 0;
  const timeRanges: Array<'7D' | '30D' | '90D' | 'ALL'> = ['7D', '30D', '90D', 'ALL'];

  const hoverPoint =
    hoveredIndex !== null &&
    hoveredIndex >= 0 &&
    hoveredIndex < data.length
      ? data[hoveredIndex]
      : undefined;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-syne font-bold text-lg mb-1">APY Trend</h3>
          {marketName && (
            <p className="text-sm text-gray-400">{marketName}</p>
          )}
        </div>
        
        {/* Time Range Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
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

      {/* Current APY Display */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-3xl font-bold text-brand-green">
            {summary.currentAPY.toFixed(1)}%
          </span>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-brand-green' : 'text-red-500'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-mono font-semibold">
              {isPositive ? '+' : ''}{summary.apyChange.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400">
              ({isPositive ? '+' : ''}{summary.apyChangePct.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          Current Annual Percentage Yield
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Average APY</div>
          <div className="font-mono font-semibold text-brand-cyan">{summary.avgAPY.toFixed(1)}%</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Peak APY</div>
          <div className="font-mono font-semibold text-brand-green">{summary.maxAPY.toFixed(1)}%</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Low APY</div>
          <div className="font-mono font-semibold text-gray-300">{summary.minAPY.toFixed(1)}%</div>
        </div>
      </div>

      {/* Chart */}
      <div 
        ref={chartRef}
        className="relative bg-brand-bg rounded-lg p-4" 
        style={{ height: '240px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
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

          {/* Area fill with gradient */}
          <defs>
            <linearGradient id="apyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00FF87" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00FF87" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#apyGradient)" />

          {/* Line */}
          <path
            d={path}
            fill="none"
            stroke="#00FF87"
            strokeWidth="2"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
          <span>{maxAPY.toFixed(1)}%</span>
          <span>{((maxAPY + minAPY) / 2).toFixed(1)}%</span>
          <span>{minAPY.toFixed(1)}%</span>
        </div>

        {/* Tooltip */}
        {hoverPoint && hoveredIndex !== null && (
          <>
            {/* Vertical indicator line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-brand-green/50"
              style={{
                left: `${(hoveredIndex / Math.max(data.length - 1, 1)) * 100}%`,
              }}
            />
            
            {/* Tooltip box */}
            <div
              className="absolute z-10 bg-brand-bg/95 border border-brand-green/30 rounded-lg p-3 shadow-xl pointer-events-none"
              style={{
                left: mousePosition.x > chartRef.current!.offsetWidth / 2 ? 'auto' : `${mousePosition.x + 10}px`,
                right: mousePosition.x > chartRef.current!.offsetWidth / 2 ? `${chartRef.current!.offsetWidth - mousePosition.x + 10}px` : 'auto',
                top: `${Math.max(10, Math.min(mousePosition.y - 40, chartRef.current!.offsetHeight - 100))}px`,
              }}
            >
              <div className="text-xs text-gray-400 mb-2">
                {hoverPoint.timestamp.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">APY:</span>
                  <span className="font-mono font-bold text-brand-green">
                    {hoverPoint.apy.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Pool Size:</span>
                  <span className="font-mono text-xs">
                    ${(hoverPoint.poolSize / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Volume 24h:</span>
                  <span className="font-mono text-xs">
                    ${(hoverPoint.volume24h / 1000).toFixed(1)}K
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>{data[0]?.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>Now</span>
      </div>
    </div>
  );
}
