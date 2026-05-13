import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, PieChart } from 'lucide-react';
import { formatPnL } from '~/lib/trading/calculations';

interface PnLDataPoint {
  date: Date;
  pnl: number;
  cumulativePnl: number;
}

interface WinRateDataPoint {
  date: Date;
  winRate: number;
  trades: number;
}

interface RoiDataPoint {
  date: Date;
  roi: number;
}

interface VolumeDataPoint {
  date: Date;
  volume: number;
}

interface ProfitDistribution {
  wins: number;
  losses: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
}

interface TraderPerformanceChartsProps {
  pnlHistory: PnLDataPoint[];
  winRateHistory: WinRateDataPoint[];
  roiHistory: RoiDataPoint[];
  volumeHistory: VolumeDataPoint[];
  profitDistribution: ProfitDistribution;
}

export function TraderPerformanceCharts({
  pnlHistory,
  winRateHistory,
  roiHistory,
  volumeHistory,
  profitDistribution,
}: TraderPerformanceChartsProps) {
  if (pnlHistory.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-gray-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No performance data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cumulative P&L Chart */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="font-syne font-bold text-xl mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-brand-green" />
          Cumulative Profit & Loss
        </h3>
        <CumulativePnLChart data={pnlHistory} />
      </div>

      {/* Win Rate & ROI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-syne font-bold text-xl mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-cyan" />
            Win Rate Over Time
          </h3>
          <WinRateChart data={winRateHistory} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-syne font-bold text-xl mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-green" />
            ROI Progression
          </h3>
          <RoiChart data={roiHistory} />
        </div>
      </div>

      {/* Trading Volume Chart */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="font-syne font-bold text-xl mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-cyan" />
          Trading Volume
        </h3>
        <VolumeChart data={volumeHistory} />
      </div>

      {/* Profit Distribution */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="font-syne font-bold text-xl mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-brand-green" />
          Profit Distribution
        </h3>
        <ProfitDistributionStats distribution={profitDistribution} />
      </div>
    </div>
  );
}

function CumulativePnLChart({ data }: { data: PnLDataPoint[] }) {
  if (data.length === 0) return null;

  const maxPnl = Math.max(...data.map(d => d.cumulativePnl));
  const minPnl = Math.min(...data.map(d => d.cumulativePnl));
  const range = Math.max(Math.abs(maxPnl), Math.abs(minPnl), 1e-9);
  const lastPoint = data[data.length - 1];
  if (lastPoint === undefined) return null;
  const finalPnl = lastPoint.cumulativePnl;
  const isPositive = finalPnl >= 0;
  const xDenom = Math.max(1, data.length - 1);

  return (
    <div>
      <div className="relative" style={{ height: "300px" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
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

          {/* Zero line */}
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.3"
            strokeDasharray="2,2"
          />

          {/* Area under curve */}
          <path
            d={
              data
                .map((d, i) => {
                  const x = (i / xDenom) * 100;
                  const y = 50 - (d.cumulativePnl / (range * 2)) * 100;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ") + ` L 100 50 L 0 50 Z`
            }
            fill={isPositive ? "#00FF87" : "#EF4444"}
            fillOpacity="0.1"
          />

          {/* Line */}
          <path
            d={data
              .map((d, i) => {
                const x = (i / xDenom) * 100;
                const y = 50 - (d.cumulativePnl / (range * 2)) * 100;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={isPositive ? "#00FF87" : "#EF4444"}
            strokeWidth="2"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / xDenom) * 100;
            const y = 50 - (d.cumulativePnl / (range * 2)) * 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1"
                fill={isPositive ? "#00FF87" : "#EF4444"}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-brand-green" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className="text-gray-400">Total P&L:</span>
          <span className={`font-mono font-bold ${isPositive ? 'text-brand-green' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}${finalPnl.toFixed(2)}
          </span>
        </div>
        <div className="text-gray-400">
          {data.length} day{data.length !== 1 ? 's' : ''} of trading
        </div>
      </div>
    </div>
  );
}

function WinRateChart({ data }: { data: WinRateDataPoint[] }) {
  if (data.length === 0) return null;

  const avgWinRate = data.reduce((sum, d) => sum + d.winRate, 0) / data.length;
  const xDenom = Math.max(1, data.length - 1);

  return (
    <div>
      <div className="relative" style={{ height: "250px" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid */}
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

          {/* Average line */}
          <line
            x1="0"
            y1={100 - avgWinRate}
            x2="100"
            y2={100 - avgWinRate}
            stroke="#00D4FF"
            strokeWidth="0.3"
            strokeDasharray="2,2"
            opacity="0.5"
          />

          {/* Area */}
          <path
            d={
              data
                .map((d, i) => {
                  const x = (i / xDenom) * 100;
                  const y = 100 - d.winRate;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ") + ` L 100 100 L 0 100 Z`
            }
            fill="#00D4FF"
            fillOpacity="0.1"
          />

          {/* Line */}
          <path
            d={data
              .map((d, i) => {
                const x = (i / xDenom) * 100;
                const y = 100 - d.winRate;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#00D4FF"
            strokeWidth="2"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / xDenom) * 100;
            const y = 100 - d.winRate;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1"
                fill="#00D4FF"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-cyan rounded-full" />
          <span className="text-gray-400">Win Rate</span>
        </div>
        <div className="text-gray-400">
          Average: <span className="font-mono font-bold text-brand-cyan">{avgWinRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function RoiChart({ data }: { data: RoiDataPoint[] }) {
  if (data.length === 0) return null;

  const maxRoi = Math.max(...data.map(d => Math.abs(d.roi)), 1e-9);
  const lastRoi = data[data.length - 1];
  if (lastRoi === undefined) return null;
  const finalRoi = lastRoi.roi;
  const isPositive = finalRoi >= 0;
  const xDenom = Math.max(1, data.length - 1);

  return (
    <div>
      <div className="relative" style={{ height: "250px" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid */}
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

          {/* Zero line */}
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.3"
            strokeDasharray="2,2"
          />

          {/* Line */}
          <path
            d={data
              .map((d, i) => {
                const x = (i / xDenom) * 100;
                const y = 50 - (d.roi / (maxRoi * 2)) * 100;
                return `${i === 0 ? "M" : "L"} ${x} ${Math.max(0, Math.min(100, y))}`;
              })
              .join(" ")}
            fill="none"
            stroke="#00FF87"
            strokeWidth="2"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / xDenom) * 100;
            const y = 50 - (d.roi / (maxRoi * 2)) * 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={Math.max(0, Math.min(100, y))}
                r="1"
                fill="#00FF87"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-green rounded-full" />
          <span className="text-gray-400">ROI</span>
        </div>
        <div className="text-gray-400">
          Current: <span className={`font-mono font-bold ${isPositive ? 'text-brand-green' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{finalRoi.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function VolumeChart({ data }: { data: VolumeDataPoint[] }) {
  if (data.length === 0) return null;

  const maxVolume = Math.max(...data.map(d => d.volume));
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);

  return (
    <div>
      <div className="relative" style={{ height: "200px" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid */}
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

          {/* Bars */}
          {data.map((d, i) => {
            const x = (i / data.length) * 100;
            const barWidth = 100 / data.length * 0.8;
            const height = maxVolume > 0 ? (d.volume / maxVolume) * 100 : 0;
            const y = 100 - height;
            
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={height}
                fill="#00D4FF"
                opacity="0.6"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-cyan rounded-full" />
          <span className="text-gray-400">Daily Volume</span>
        </div>
        <div className="text-gray-400">
          Total: <span className="font-mono font-bold text-white">${totalVolume.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function ProfitDistributionStats({ distribution }: { distribution: ProfitDistribution }) {
  const totalTrades = distribution.wins + distribution.losses;
  const winRate = totalTrades > 0 ? (distribution.wins / totalTrades) * 100 : 0;
  const avgWinFormatted = formatPnL(distribution.avgWin);
  const avgLossFormatted = formatPnL(distribution.avgLoss);
  const largestWinFormatted = formatPnL(distribution.largestWin);
  const largestLossFormatted = formatPnL(distribution.largestLoss);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-1">Winning Trades</div>
        <div className="font-mono font-bold text-2xl text-brand-green">{distribution.wins}</div>
        <div className="text-xs text-gray-500 mt-1">{winRate.toFixed(1)}% of total</div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-1">Losing Trades</div>
        <div className="font-mono font-bold text-2xl text-red-500">{distribution.losses}</div>
        <div className="text-xs text-gray-500 mt-1">{(100 - winRate).toFixed(1)}% of total</div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-1">Avg Win</div>
        <div className={`font-mono font-bold text-xl ${avgWinFormatted.colorClass}`}>
          {avgWinFormatted.text}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-1">Avg Loss</div>
        <div className={`font-mono font-bold text-xl ${avgLossFormatted.colorClass}`}>
          {avgLossFormatted.text}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-1">Largest Win</div>
        <div className={`font-mono font-bold text-xl ${largestWinFormatted.colorClass}`}>
          {largestWinFormatted.text}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-1">Largest Loss</div>
        <div className={`font-mono font-bold text-xl ${largestLossFormatted.colorClass}`}>
          {largestLossFormatted.text}
        </div>
      </div>
    </div>
  );
}
