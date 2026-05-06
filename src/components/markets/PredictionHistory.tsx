import { Market } from '~/data/mockMarkets';

interface PredictionHistoryProps {
  market: Market;
  history: Array<{
    timestamp: Date;
    percentA: number;
    percentB: number;
    percentDraw?: number;
    volume: number;
  }>;
}

export function PredictionHistory({ market, history }: PredictionHistoryProps) {
  const hasDrawOption = market.percentDraw !== undefined;

  // Calculate min and max for scaling
  const allPercents = history.flatMap((h) => [
    h.percentA,
    h.percentB,
    ...(h.percentDraw ? [h.percentDraw] : []),
  ]);
  const minPercent = Math.max(0, Math.min(...allPercents) - 5);
  const maxPercent = Math.min(100, Math.max(...allPercents) + 5);
  const range = maxPercent - minPercent;

  // Generate SVG path for a line
  const generatePath = (data: number[]) => {
    const width = 100;
    const height = 100;
    const stepX = width / (data.length - 1);

    return data
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - minPercent) / range) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const pathA = generatePath(history.map((h) => h.percentA));
  const pathB = generatePath(history.map((h) => h.percentB));
  const pathDraw = hasDrawOption ? generatePath(history.map((h) => h.percentDraw || 0)) : '';

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-xl mb-4">Prediction History (24h)</h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-green rounded-full"></div>
          <span>{market.teamA}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>{market.teamB}</span>
        </div>
        {hasDrawOption && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Draw</span>
          </div>
        )}
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

          {/* Lines */}
          <path d={pathA} fill="none" stroke="#00FF87" strokeWidth="1.5" />
          <path d={pathB} fill="none" stroke="#3B82F6" strokeWidth="1.5" />
          {hasDrawOption && (
            <path d={pathDraw} fill="none" stroke="#EAB308" strokeWidth="1.5" />
          )}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-mono pr-2">
          <span>{maxPercent}%</span>
          <span>{((maxPercent + minPercent) / 2).toFixed(0)}%</span>
          <span>{minPercent}%</span>
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}
