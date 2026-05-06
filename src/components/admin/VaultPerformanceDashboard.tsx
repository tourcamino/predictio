import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { TrendingUp, DollarSign, Activity, Target, Download, Image, FileText } from 'lucide-react';
import { KPICard } from './KPICard';
import { Menu } from '@headlessui/react';

export function VaultPerformanceDashboard() {
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const [activeView, setActiveView] = useState<'tvl' | 'fees' | 'exposure'>('tvl');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  const performanceQuery = useQuery({
    ...trpc.getVaultPerformanceHistory.queryOptions({ timeRange }),
  });

  const data = performanceQuery.data;

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
      link.download = `vault-performance-${timeRange.toLowerCase()}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  }, [timeRange]);

  const exportToCSV = useCallback(() => {
    if (!data?.historicalData) return;

    const headers = [
      'Date',
      'TVL (USDC)',
      'Available Liquidity (USDC)',
      'Exposed Liquidity (USDC)',
      'Daily Fees (USDC)',
      'Cumulative Fees (USDC)',
      'Utilization Rate (%)',
    ];
    
    const rows = data.historicalData.map(point => [
      point.date.toISOString().split('T')[0],
      point.tvl.toFixed(2),
      point.availableLiquidity.toFixed(2),
      point.exposedLiquidity.toFixed(2),
      point.feesEarned.toFixed(2),
      point.cumulativeFees.toFixed(2),
      ((point.exposedLiquidity / point.tvl) * 100).toFixed(2),
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `vault-performance-${timeRange.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, timeRange]);

  const exportToPDF = useCallback(async () => {
    if (!data?.historicalData) return;

    try {
      // For PDF, we'll create a more comprehensive report
      const reportContent = `
PROTOCOL VAULT PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}
Time Range: ${timeRange}

=== KEY METRICS ===
Total TVL: $${data.currentMetrics.totalTvl.toFixed(2)}
Available Liquidity: $${data.currentMetrics.availableLiquidity.toFixed(2)}
Exposed Liquidity: $${data.currentMetrics.exposedLiquidity.toFixed(2)}
Total Fees Collected: $${data.currentMetrics.totalFeesCollected.toFixed(2)}
ROI: ${data.currentMetrics.roi}%
APY: ${data.currentMetrics.apy}%
Active Orders: ${data.currentMetrics.activeOrdersCount}
Total Orders Placed: ${data.currentMetrics.totalOrdersPlaced}

=== HISTORICAL DATA ===
${data.historicalData.map(point => 
  `${point.date.toISOString().split('T')[0]} | TVL: $${point.tvl.toFixed(2)} | Fees: $${point.feesEarned.toFixed(2)} | Cumulative: $${point.cumulativeFees.toFixed(2)}`
).join('\n')}
      `.trim();

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `vault-performance-report-${timeRange.toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  }, [data, timeRange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || !data?.historicalData.length) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const chartWidth = rect.width;
    const pointSpacing = chartWidth / Math.max(data.historicalData.length - 1, 1);
    const index = Math.round(x / pointSpacing);
    
    if (index >= 0 && index < data.historicalData.length) {
      setHoveredIndex(index);
      setMousePosition({ x, y });
    }
  }, [data?.historicalData.length]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (performanceQuery.isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/3"></div>
          <div className="h-64 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Generate SVG paths
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
  let minValue = 0;
  let maxValue = 0;
  let viewTitle = '';
  let viewColor = '#00FF87';

  if (activeView === 'tvl') {
    const values = data.historicalData.map(d => d.tvl);
    primaryPath = generatePath(values);
    primaryAreaPath = generateAreaPath(values);
    minValue = Math.min(...values);
    maxValue = Math.max(...values);
    viewTitle = 'Total Value Locked';
    viewColor = '#00FF87';
  } else if (activeView === 'fees') {
    const values = data.historicalData.map(d => d.cumulativeFees);
    primaryPath = generatePath(values);
    primaryAreaPath = generateAreaPath(values);
    minValue = Math.min(...values);
    maxValue = Math.max(...values);
    viewTitle = 'Cumulative Fees Earned';
    viewColor = '#00D4FF';
  } else {
    const values = data.historicalData.map(d => d.exposedLiquidity);
    primaryPath = generatePath(values);
    primaryAreaPath = generateAreaPath(values);
    minValue = Math.min(...values);
    maxValue = Math.max(...values);
    viewTitle = 'Exposed Liquidity';
    viewColor = '#A78BFA';
  }

  const timeRanges: Array<'7D' | '30D' | '90D' | 'ALL'> = ['7D', '30D', '90D', 'ALL'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-syne font-bold mb-1">Protocol Vault Performance</h2>
          <p className="text-sm text-gray-400">Historical analytics and ROI metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Export Menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm font-semibold">
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
                    <span>Export Chart as PNG</span>
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
                    <span>Export Data as CSV</span>
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={exportToPDF}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                      active ? 'bg-white/10' : ''
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Export Report as TXT</span>
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>

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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-brand-green/10 to-brand-green/5 border border-brand-green/20 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total TVL</div>
          <div className="font-mono font-bold text-3xl text-brand-green mb-2">
            ${data.currentMetrics.totalTvl.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">
            Available: ${data.currentMetrics.availableLiquidity.toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-brand-cyan/10 to-brand-cyan/5 border border-brand-cyan/20 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Total Fees Collected</div>
          <div className="font-mono font-bold text-3xl text-brand-cyan mb-2">
            ${data.currentMetrics.totalFeesCollected.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">
            Protocol revenue share
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-400/10 to-purple-400/5 border border-purple-400/20 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">ROI</div>
          <div className={`font-mono font-bold text-3xl mb-2 ${
            data.currentMetrics.roi >= 0 ? 'text-brand-green' : 'text-red-500'
          }`}>
            {data.currentMetrics.roi >= 0 ? '+' : ''}{data.currentMetrics.roi}%
          </div>
          <div className="text-xs text-gray-400">
            Since inception
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">APY</div>
          <div className="font-mono font-bold text-3xl text-white mb-2">
            {data.currentMetrics.apy.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">
            Annualized return
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('tvl')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeView === 'tvl'
              ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Total Value Locked
        </button>
        <button
          onClick={() => setActiveView('fees')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeView === 'fees'
              ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Fee Accumulation
        </button>
        <button
          onClick={() => setActiveView('exposure')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeView === 'exposure'
              ? 'bg-purple-400/20 text-purple-400 border border-purple-400/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Activity className="w-4 h-4" />
          Exposed Liquidity
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">{viewTitle}</h3>
        
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
                  <linearGradient id="vaultGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={viewColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={viewColor} stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path d={primaryAreaPath} fill="url(#vaultGradient)" />
              </>
            )}

            {/* Primary line */}
            <path
              d={primaryPath}
              fill="none"
              stroke={viewColor}
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
          {hoveredIndex !== null && data.historicalData[hoveredIndex] && (
            <>
              {/* Vertical indicator line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-brand-green/50"
                style={{
                  left: `${(hoveredIndex / Math.max(data.historicalData.length - 1, 1)) * 100}%`,
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
                  {data.historicalData[hoveredIndex].date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-400">TVL:</span>
                    <span className="font-mono font-semibold text-brand-green text-xs">
                      ${data.historicalData[hoveredIndex].tvl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-400">Exposed:</span>
                    <span className="font-mono font-semibold text-purple-400 text-xs">
                      ${data.historicalData[hoveredIndex].exposedLiquidity.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-400">Fees (day):</span>
                    <span className="font-mono font-semibold text-brand-cyan text-xs">
                      ${data.historicalData[hoveredIndex].feesEarned.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
          <span>{data.historicalData[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <span>Now</span>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-cyan" />
            Trading Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Active Orders</span>
              <span className="font-mono font-semibold text-lg">
                {data.currentMetrics.activeOrdersCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Orders Placed</span>
              <span className="font-mono font-semibold text-lg">
                {data.currentMetrics.totalOrdersPlaced}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Exposed Liquidity</span>
              <span className="font-mono font-semibold text-lg text-purple-400">
                ${data.currentMetrics.exposedLiquidity.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-green" />
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Utilization Rate</span>
              <span className="font-mono font-semibold text-lg">
                {((data.currentMetrics.exposedLiquidity / data.currentMetrics.totalTvl) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Avg Daily Fees</span>
              <span className="font-mono font-semibold text-lg text-brand-cyan">
                ${(data.currentMetrics.totalFeesCollected / Math.max(data.historicalData.length, 1)).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">ROI</span>
              <span className={`font-mono font-semibold text-lg ${
                data.currentMetrics.roi >= 0 ? 'text-brand-green' : 'text-red-500'
              }`}>
                {data.currentMetrics.roi >= 0 ? '+' : ''}{data.currentMetrics.roi}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
