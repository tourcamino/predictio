import { TrendingUp, TrendingDown, Download, Image, FileText } from 'lucide-react';
import { formatCurrency } from '~/utils/marketUtils';
import { useState, useRef, useCallback } from 'react';
import { Menu } from '@headlessui/react';
import { DateRangePicker } from './DateRangePicker';

interface DataPoint {
  timestamp: Date;
  portfolioValue: number;
  cumulativePnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalInvested: number;
}

interface PortfolioValueChartProps {
  data: DataPoint[];
  summary: {
    totalReturn: number;
    totalReturnPct: number;
    startValue: number;
    endValue: number;
    highestValue: number;
    lowestValue: number;
  };
  timeRange: string;
  onTimeRangeChange: (range: '7D' | '30D' | '90D' | '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM') => void;
  onCustomRangeChange?: (startDate: Date, endDate: Date) => void;
}

export function PortfolioValueChart({
  data,
  summary,
  timeRange,
  onTimeRangeChange,
  onCustomRangeChange,
}: PortfolioValueChartProps) {
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

  const exportToPNG = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      const { default: htmlToImage } = await import('html-to-image');
      const dataUrl = await htmlToImage.toPng(chartRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0A0F1E',
      });
      
      const link = document.createElement('a');
      link.download = `portfolio-value-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  }, []);

  const exportToCSV = useCallback(() => {
    const headers = ['Date', 'Portfolio Value', 'Cumulative P&L', 'Realized P&L', 'Unrealized P&L', 'Total Invested'];
    const rows = data.map(point => [
      point.timestamp.toISOString(),
      point.portfolioValue.toFixed(2),
      point.cumulativePnL.toFixed(2),
      point.realizedPnL.toFixed(2),
      point.unrealizedPnL.toFixed(2),
      point.totalInvested.toFixed(2),
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `portfolio-value-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="font-syne font-bold text-xl mb-4">Portfolio Value</h2>
        <div className="text-center py-12 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const values = data.map(d => d.portfolioValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Generate SVG path for the line
  const generatePath = (dataValues: number[]) => {
    if (dataValues.length === 0) return '';
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(dataValues.length - 1, 1);

    return dataValues
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - minValue) / range) * height;
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

  const path = generatePath(values);
  const areaPath = generateAreaPath(values);

  const isPositive = summary.totalReturn >= 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-syne font-bold text-xl mb-2">Portfolio Value</h2>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold">
              {formatCurrency(summary.endValue)}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-brand-green' : 'text-red-500'}`}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="font-mono font-bold">
                {isPositive ? '+' : ''}{formatCurrency(summary.totalReturn)}
              </span>
              <span className="text-sm">
                ({isPositive ? '+' : ''}{summary.totalReturnPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Export Menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm font-semibold">
              <Download className="w-4 h-4" />
              Export
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-brand-bg border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={exportToPNG}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                      active ? 'bg-white/10' : ''
                    }`}
                  >
                    <Image className="w-4 h-4" />
                    <span>Export as PNG</span>
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={exportToCSV}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                      active ? 'bg-white/10' : ''
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Export as CSV</span>
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>

          {/* Date Range Picker */}
          <DateRangePicker
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            onCustomRangeChange={onCustomRangeChange}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Start Value</div>
          <div className="font-mono font-semibold">{formatCurrency(summary.startValue)}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Highest</div>
          <div className="font-mono font-semibold text-brand-green">
            {formatCurrency(summary.highestValue)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Lowest</div>
          <div className="font-mono font-semibold text-red-500">
            {formatCurrency(summary.lowestValue)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div 
        ref={chartRef}
        className="relative bg-brand-bg rounded-lg p-4" 
        style={{ height: '300px' }}
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
            <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? "#00FF87" : "#EF4444"} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? "#00FF87" : "#EF4444"} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#portfolioGradient)" />

          {/* Line */}
          <path
            d={path}
            fill="none"
            stroke={isPositive ? "#00FF87" : "#EF4444"}
            strokeWidth="2"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency((maxValue + minValue) / 2)}</span>
          <span>{formatCurrency(minValue)}</span>
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
              className="absolute z-10 bg-brand-bg/95 border border-white/20 rounded-lg p-3 shadow-xl pointer-events-none"
              style={{
                left: mousePosition.x > chartRef.current!.offsetWidth / 2 ? 'auto' : `${mousePosition.x + 10}px`,
                right: mousePosition.x > chartRef.current!.offsetWidth / 2 ? `${chartRef.current!.offsetWidth - mousePosition.x + 10}px` : 'auto',
                top: `${Math.max(10, Math.min(mousePosition.y - 50, chartRef.current!.offsetHeight - 120))}px`,
              }}
            >
              <div className="text-xs text-gray-400 mb-2">
                {data[hoveredIndex].timestamp.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Portfolio Value:</span>
                  <span className="font-mono font-semibold text-sm">
                    {formatCurrency(data[hoveredIndex].portfolioValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Total P&L:</span>
                  <span className={`font-mono font-semibold text-sm ${
                    data[hoveredIndex].cumulativePnL >= 0 ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {data[hoveredIndex].cumulativePnL >= 0 ? '+' : ''}
                    {formatCurrency(data[hoveredIndex].cumulativePnL)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Invested:</span>
                  <span className="font-mono text-sm">
                    {formatCurrency(data[hoveredIndex].totalInvested)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>{data[0]?.timestamp.toLocaleDateString()}</span>
        <span>Now</span>
      </div>
    </div>
  );
}
