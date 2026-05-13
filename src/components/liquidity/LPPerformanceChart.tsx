import { useState, useRef, useCallback } from 'react';
import { TrendingUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface PerformanceDataPoint {
  timestamp: Date;
  type: 'deposit' | 'withdrawal' | 'fee';
  amount: number;
  cumulativeDeposits: number;
  cumulativeWithdrawals: number;
  cumulativeFees: number;
  totalValue: number;
}

interface LPPerformanceChartProps {
  data: PerformanceDataPoint[];
  summary: {
    totalDeposited: number;
    totalWithdrawn: number;
    totalFeesEarned: number;
    currentValue: number;
    netDeposits: number;
    roi: number;
  };
  marketName?: string;
}

export function LPPerformanceChart({
  data,
  summary,
  marketName,
}: LPPerformanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showDeposits, setShowDeposits] = useState(true);
  const [showWithdrawals, setShowWithdrawals] = useState(true);
  const [showFees, setShowFees] = useState(true);
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
        <h3 className="font-syne font-bold text-lg mb-4">Position Performance</h3>
        <div className="text-center py-12 text-gray-400">
          No performance history available yet
        </div>
      </div>
    );
  }

  // Calculate min/max for scaling
  const allValues = data.map(d => d.totalValue);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;
  const buffer = range * 0.1;

  // Generate SVG paths
  const generatePath = (dataValues: number[]) => {
    if (dataValues.length === 0) return '';
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(dataValues.length - 1, 1);

    return dataValues
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - (minValue - buffer)) / (range + buffer * 2)) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const generateAreaPath = (dataValues: number[]) => {
    if (dataValues.length === 0) return '';
    const linePath = generatePath(dataValues);
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(dataValues.length - 1, 1);
    const lastX = (dataValues.length - 1) * stepX;
    
    return `${linePath} L ${lastX} ${height} L 0 ${height} Z`;
  };

  const totalValuePath = generatePath(data.map(d => d.totalValue));
  const totalValueAreaPath = generateAreaPath(data.map(d => d.totalValue));
  const depositsPath = generatePath(data.map(d => d.cumulativeDeposits));
  const feesPath = generatePath(data.map(d => d.cumulativeFees));

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
          <h3 className="font-syne font-bold text-lg mb-1">Position Performance</h3>
          {marketName && (
            <p className="text-sm text-gray-400">{marketName}</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Current Value</div>
          <div className="font-mono font-bold text-brand-green">${summary.currentValue.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total Deposited</div>
          <div className="font-mono font-semibold text-brand-cyan">${summary.totalDeposited.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Fees Earned</div>
          <div className="font-mono font-semibold text-brand-green">${summary.totalFeesEarned.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">ROI</div>
          <div className={`font-mono font-bold ${summary.roi >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
            {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Legend / Toggle */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setShowDeposits(!showDeposits)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
            showDeposits 
              ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30' 
              : 'bg-white/5 text-gray-400'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          Deposits
        </button>
        <button
          onClick={() => setShowWithdrawals(!showWithdrawals)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
            showWithdrawals 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
              : 'bg-white/5 text-gray-400'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Withdrawals
        </button>
        <button
          onClick={() => setShowFees(!showFees)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
            showFees 
              ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' 
              : 'bg-white/5 text-gray-400'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Cumulative Fees
        </button>
      </div>

      {/* Chart */}
      <div 
        ref={chartRef}
        className="relative bg-brand-bg rounded-lg p-4" 
        style={{ height: '280px' }}
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

          {/* Area fill for total value */}
          <defs>
            <linearGradient id="valueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00FF87" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00FF87" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={totalValueAreaPath} fill="url(#valueGradient)" />

          {/* Lines */}
          {showDeposits && (
            <path
              d={depositsPath}
              fill="none"
              stroke="#00D4FF"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
          )}
          {showFees && (
            <path
              d={feesPath}
              fill="none"
              stroke="#00FF87"
              strokeWidth="1.5"
              strokeDasharray="5,5"
            />
          )}
          <path
            d={totalValuePath}
            fill="none"
            stroke="#00FF87"
            strokeWidth="2.5"
          />

          {/* Event markers */}
          {data.map((point, index) => {
            if (point.type === 'deposit' || point.type === 'withdrawal') {
              const x = (index / Math.max(data.length - 1, 1)) * 100;
              const y = 100 - ((point.totalValue - (minValue - buffer)) / (range + buffer * 2)) * 100;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill={point.type === 'deposit' ? '#00D4FF' : '#EF4444'}
                  opacity="0.8"
                />
              );
            }
            return null;
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
          <span>${maxValue.toFixed(0)}</span>
          <span>${((maxValue + minValue) / 2).toFixed(0)}</span>
          <span>${minValue.toFixed(0)}</span>
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
                top: `${Math.max(10, Math.min(mousePosition.y - 40, chartRef.current!.offsetHeight - 120))}px`,
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
                  <span className="text-xs text-gray-400">Event:</span>
                  <span className="font-semibold text-xs capitalize">
                    {hoverPoint.type === 'fee' ? 'Fee Earned' : hoverPoint.type}
                    {hoverPoint.type !== 'fee' && ` $${hoverPoint.amount.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Total Value:</span>
                  <span className="font-mono font-bold text-brand-green text-xs">
                    ${hoverPoint.totalValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Cumulative Fees:</span>
                  <span className="font-mono text-xs text-brand-green">
                    ${hoverPoint.cumulativeFees.toFixed(2)}
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
