import { TrendingUp, TrendingDown, DollarSign, Download, Image, FileText } from 'lucide-react';
import { formatCurrency } from '~/utils/marketUtils';
import { useState, useRef, useCallback } from 'react';
import { Menu } from '@headlessui/react';

interface DataPoint {
  timestamp: Date;
  portfolioValue: number;
  cumulativePnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalInvested: number;
}

interface PnLHistoryChartProps {
  data: DataPoint[];
}

export function PnLHistoryChart({ data }: PnLHistoryChartProps) {
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
      link.download = `pnl-history-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  }, []);

  const exportToCSV = useCallback(() => {
    const headers = ['Date', 'Total P&L', 'Realized P&L', 'Unrealized P&L', 'Portfolio Value', 'Total Invested'];
    const rows = data.map(point => [
      point.timestamp.toISOString(),
      point.cumulativePnL.toFixed(2),
      point.realizedPnL.toFixed(2),
      point.unrealizedPnL.toFixed(2),
      point.portfolioValue.toFixed(2),
      point.totalInvested.toFixed(2),
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `pnl-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="font-syne font-bold text-xl mb-4">P&L History</h2>
        <div className="text-center py-12 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const cumulativePnLValues = data.map(d => d.cumulativePnL);
  const realizedPnLValues = data.map(d => d.realizedPnL);
  const unrealizedPnLValues = data.map(d => d.unrealizedPnL);

  const allValues = [...cumulativePnLValues, ...realizedPnLValues, ...unrealizedPnLValues, 0];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;

  // Generate SVG path for a line
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

  const cumulativePath = generatePath(cumulativePnLValues);
  const realizedPath = generatePath(realizedPnLValues);
  const unrealizedPath = generatePath(unrealizedPnLValues);

  // Calculate zero line position
  const zeroY = 100 - ((0 - minValue) / range) * 100;

  const latestData = data[data.length - 1]!;
  const cumulativePnL = latestData.cumulativePnL;
  const realizedPnL = latestData.realizedPnL;
  const unrealizedPnL = latestData.unrealizedPnL;

  const hoverPoint =
    hoveredIndex !== null &&
    hoveredIndex >= 0 &&
    hoveredIndex < data.length
      ? data[hoveredIndex]
      : undefined;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-syne font-bold text-xl">P&L History</h2>
          
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
        </div>
        
        {/* Current P&L Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <div className="text-xs text-gray-400">Total P&L</div>
            </div>
            <div className={`font-mono text-xl font-bold ${
              cumulativePnL >= 0 ? 'text-brand-green' : 'text-red-500'
            }`}>
              {cumulativePnL >= 0 ? '+' : ''}{formatCurrency(cumulativePnL)}
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-brand-green" />
              <div className="text-xs text-gray-400">Realized</div>
            </div>
            <div className={`font-mono text-xl font-bold ${
              realizedPnL >= 0 ? 'text-brand-green' : 'text-red-500'
            }`}>
              {realizedPnL >= 0 ? '+' : ''}{formatCurrency(realizedPnL)}
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-brand-cyan" />
              <div className="text-xs text-gray-400">Unrealized</div>
            </div>
            <div className={`font-mono text-xl font-bold ${
              unrealizedPnL >= 0 ? 'text-brand-green' : 'text-red-500'
            }`}>
              {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-green rounded-full"></div>
          <span>Total P&L</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-cyan rounded-full"></div>
          <span>Realized</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
          <span>Unrealized</span>
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

          {/* Zero baseline */}
          <line
            x1="0"
            y1={zeroY}
            x2="100"
            y2={zeroY}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />

          {/* Lines */}
          <path d={unrealizedPath} fill="none" stroke="#A78BFA" strokeWidth="1.5" />
          <path d={realizedPath} fill="none" stroke="#00E5FF" strokeWidth="1.5" />
          <path d={cumulativePath} fill="none" stroke="#00FF87" strokeWidth="2" />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
          <span>{formatCurrency(maxValue)}</span>
          <span>$0</span>
          <span>{formatCurrency(minValue)}</span>
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
              className="absolute z-10 bg-brand-bg/95 border border-white/20 rounded-lg p-3 shadow-xl pointer-events-none"
              style={{
                left: mousePosition.x > chartRef.current!.offsetWidth / 2 ? 'auto' : `${mousePosition.x + 10}px`,
                right: mousePosition.x > chartRef.current!.offsetWidth / 2 ? `${chartRef.current!.offsetWidth - mousePosition.x + 10}px` : 'auto',
                top: `${Math.max(10, Math.min(mousePosition.y - 60, chartRef.current!.offsetHeight - 140))}px`,
              }}
            >
              <div className="text-xs text-gray-400 mb-2">
                {hoverPoint.timestamp.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                    <span className="text-xs text-gray-400">Total P&L:</span>
                  </div>
                  <span className={`font-mono font-semibold text-sm ${
                    hoverPoint.cumulativePnL >= 0 ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {hoverPoint.cumulativePnL >= 0 ? '+' : ''}
                    {formatCurrency(hoverPoint.cumulativePnL)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-brand-cyan rounded-full"></div>
                    <span className="text-xs text-gray-400">Realized:</span>
                  </div>
                  <span className={`font-mono font-semibold text-sm ${
                    hoverPoint.realizedPnL >= 0 ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {hoverPoint.realizedPnL >= 0 ? '+' : ''}
                    {formatCurrency(hoverPoint.realizedPnL)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-xs text-gray-400">Unrealized:</span>
                  </div>
                  <span className={`font-mono font-semibold text-sm ${
                    hoverPoint.unrealizedPnL >= 0 ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {hoverPoint.unrealizedPnL >= 0 ? '+' : ''}
                    {formatCurrency(hoverPoint.unrealizedPnL)}
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
