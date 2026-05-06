import { useState, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface ChartDataPoint {
  date: Date;
  deposits: number;
  withdrawals: number;
  fees: number;
  cumulativeDeposits: number;
  cumulativeWithdrawals: number;
  cumulativeFees: number;
  netValue: number;
}

interface LPEarningsChartsProps {
  data: ChartDataPoint[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalFees: number;
    netValue: number;
    currentValue: number;
    roi: number;
    avgDailyFees: number;
  };
  timeRange: '7D' | '30D' | '90D' | 'ALL';
  onTimeRangeChange: (range: '7D' | '30D' | '90D' | 'ALL') => void;
}

export function LPEarningsCharts({
  data,
  summary,
  timeRange,
  onTimeRangeChange,
}: LPEarningsChartsProps) {
  const [activeView, setActiveView] = useState<'fees' | 'flows' | 'net'>('fees');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || data.length === 0) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
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
        <h3 className="font-syne font-bold text-xl mb-4">Earnings Over Time</h3>
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No earnings data available yet</p>
          <p className="text-sm mt-1">Start providing liquidity to see your earnings chart</p>
        </div>
      </div>
    );
  }

  // Generate SVG paths based on active view
  const generatePath = (dataValues: number[]) => {
    if (dataValues.length === 0) return '';
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(dataValues.length - 1, 1);
    
    const minValue = Math.min(...dataValues);
    const maxValue = Math.max(...dataValues);
    const range = maxValue - minValue || 1;
    const buffer = range * 0.1;

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
    const stepX = width / Math.max(dataValues.length - 1, 1);
    const lastX = (dataValues.length - 1) * stepX;
    
    return `${linePath} L ${lastX} 100 L 0 100 Z`;
  };

  let primaryPath = '';
  let primaryAreaPath = '';
  let secondaryPath = '';
  let minValue = 0;
  let maxValue = 0;
  let viewTitle = '';
  let viewDescription = '';

  if (activeView === 'fees') {
    const values = data.map(d => d.cumulativeFees);
    primaryPath = generatePath(values);
    primaryAreaPath = generateAreaPath(values);
    minValue = Math.min(...values);
    maxValue = Math.max(...values);
    viewTitle = 'Fee Accumulation';
    viewDescription = 'Cumulative fees earned over time';
  } else if (activeView === 'flows') {
    const depositValues = data.map(d => d.cumulativeDeposits);
    const withdrawalValues = data.map(d => d.cumulativeWithdrawals);
    primaryPath = generatePath(depositValues);
    secondaryPath = generatePath(withdrawalValues);
    minValue = 0;
    maxValue = Math.max(...depositValues, ...withdrawalValues);
    viewTitle = 'Deposits & Withdrawals';
    viewDescription = 'Capital flow trends';
  } else {
    const values = data.map(d => d.netValue);
    primaryPath = generatePath(values);
    primaryAreaPath = generateAreaPath(values);
    minValue = Math.min(...values);
    maxValue = Math.max(...values);
    viewTitle = 'Net Position Value';
    viewDescription = 'Total value including fees';
  }

  const timeRanges: Array<'7D' | '30D' | '90D' | 'ALL'> = ['7D', '30D', '90D', 'ALL'];

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-syne font-bold text-xl mb-1">Earnings Over Time</h3>
          <p className="text-sm text-gray-400">Interactive earnings visualization</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-brand-green/10 to-brand-green/5 border border-brand-green/20 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Total Fees Earned</div>
          <div className="font-mono font-bold text-lg text-brand-green">${summary.totalFees.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">
            ${summary.avgDailyFees.toFixed(2)}/day avg
          </div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Total Deposited</div>
          <div className="font-mono font-bold text-lg">${summary.totalDeposits.toFixed(2)}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Total Withdrawn</div>
          <div className="font-mono font-bold text-lg">${summary.totalWithdrawals.toFixed(2)}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">ROI</div>
          <div className={`font-mono font-bold text-lg ${summary.roi >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
            {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveView('fees')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeView === 'fees'
              ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Fee Accumulation
        </button>
        <button
          onClick={() => setActiveView('flows')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeView === 'flows'
              ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Deposits & Withdrawals
        </button>
        <button
          onClick={() => setActiveView('net')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeView === 'net'
              ? 'bg-purple-400/20 text-purple-400 border border-purple-400/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Net Value
        </button>
      </div>

      {/* Chart Title */}
      <div className="mb-4">
        <h4 className="font-semibold text-lg">{viewTitle}</h4>
        <p className="text-sm text-gray-400">{viewDescription}</p>
      </div>

      {/* Chart */}
      <div 
        ref={chartRef}
        className="relative bg-brand-bg rounded-lg p-4" 
        style={{ height: '320px' }}
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
          {primaryAreaPath && (
            <>
              <defs>
                <linearGradient id="earningsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={activeView === 'fees' ? '#00FF87' : activeView === 'net' ? '#A78BFA' : '#00D4FF'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={activeView === 'fees' ? '#00FF87' : activeView === 'net' ? '#A78BFA' : '#00D4FF'} stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d={primaryAreaPath} fill="url(#earningsGradient)" />
            </>
          )}

          {/* Secondary line (for flows view) */}
          {secondaryPath && activeView === 'flows' && (
            <path
              d={secondaryPath}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          )}

          {/* Primary line */}
          <path
            d={primaryPath}
            fill="none"
            stroke={activeView === 'fees' ? '#00FF87' : activeView === 'flows' ? '#00D4FF' : '#A78BFA'}
            strokeWidth="2.5"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
          <span>${maxValue.toFixed(0)}</span>
          <span>${((maxValue + minValue) / 2).toFixed(0)}</span>
          <span>${minValue.toFixed(0)}</span>
        </div>

        {/* Tooltip */}
        {hoveredIndex !== null && (
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
                top: `${Math.max(10, Math.min(mousePosition.y - 60, chartRef.current!.offsetHeight - 140))}px`,
              }}
            >
              <div className="text-xs text-gray-400 mb-2">
                {data[hoveredIndex].date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="space-y-1">
                {activeView === 'fees' && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">Daily Fees:</span>
                      <span className="font-mono font-semibold text-brand-green text-xs">
                        ${data[hoveredIndex].fees.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">Cumulative:</span>
                      <span className="font-mono font-bold text-brand-green">
                        ${data[hoveredIndex].cumulativeFees.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                {activeView === 'flows' && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">Deposits:</span>
                      <span className="font-mono font-semibold text-brand-cyan text-xs">
                        ${data[hoveredIndex].cumulativeDeposits.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">Withdrawals:</span>
                      <span className="font-mono font-semibold text-red-400 text-xs">
                        ${data[hoveredIndex].cumulativeWithdrawals.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">Net Flow:</span>
                      <span className="font-mono font-bold">
                        ${(data[hoveredIndex].cumulativeDeposits - data[hoveredIndex].cumulativeWithdrawals).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                {activeView === 'net' && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">Net Value:</span>
                      <span className="font-mono font-bold text-purple-400">
                        ${data[hoveredIndex].netValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">Fees:</span>
                      <span className="font-mono text-xs text-brand-green">
                        ${data[hoveredIndex].cumulativeFees.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>{data[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>Now</span>
      </div>
    </div>
  );
}
