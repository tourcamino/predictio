import { useMemo, useState } from 'react';
import { Market } from '~/data/mockMarkets';

interface PriceChartProps {
  market: Market;
}

type TimeRange = '1H' | '6H' | '24H' | '7D';

type PricePoint = { timestamp: Date; yesPrice: number; noPrice: number };

function toDate(ts: unknown): Date | null {
  if (ts instanceof Date && !Number.isNaN(ts.getTime())) return ts;
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Coerce stored probability to 0–1 (handles percent-scale inputs). */
function unitProbability(p: unknown, fallback: number): number {
  let x = typeof p === 'number' ? p : Number(p);
  if (!Number.isFinite(x)) x = fallback;
  if (x > 1) x /= 100;
  return Math.max(0.01, Math.min(0.99, x));
}

function normalizeHistoryRaw(market: Market): PricePoint[] {
  const raw = market.priceHistory ?? [];
  const out: PricePoint[] = [];
  const y0 = unitProbability(market.yesPrice, 0.5);
  const n0 = unitProbability(market.noPrice, 0.5);

  for (const h of raw) {
    const ts = toDate(h.timestamp);
    if (!ts) continue;
    let y = unitProbability(h.yesPrice, y0);
    let n = unitProbability(h.noPrice, n0);
    const sum = y + n;
    if (sum > 0 && Math.abs(sum - 1) > 0.05) {
      y /= sum;
      n /= sum;
    }
    out.push({ timestamp: ts, yesPrice: y, noPrice: n });
  }

  out.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return out;
}

export function PriceChart({ market }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');

  const baseHistory = useMemo(() => normalizeHistoryRaw(market), [market]);

  if (baseHistory.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-sm text-gray-400">
        <p className="font-semibold text-gray-300 mb-1">Price history unavailable</p>
        <p className="text-xs">
          Awaiting sufficient protocol activity. Current YES: {(market.yesPrice * 100).toFixed(0)}¢
        </p>
      </div>
    );
  }

  const msForRange: Record<TimeRange, number> = useMemo(
    () => ({
      '1H': 60 * 60 * 1000,
      '6H': 6 * 60 * 60 * 1000,
      '24H': 24 * 60 * 60 * 1000,
      '7D': 7 * 24 * 60 * 60 * 1000,
    }),
    [],
  );

  const { filteredHistory, chartHistory } = useMemo(() => {
    const now = Date.now();
    const cutoff = now - msForRange[timeRange];
    const filtered = baseHistory.filter((h) => h.timestamp.getTime() >= cutoff);
    const chart =
      filtered.length >= 2
        ? filtered
        : baseHistory.length >= 2
          ? baseHistory.slice(-Math.min(baseHistory.length, 48))
          : baseHistory;
    return { filteredHistory: filtered, chartHistory: chart };
  }, [baseHistory, msForRange, timeRange]);

  if (chartHistory.length < 2) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-sm text-gray-400">
        <p className="font-semibold text-gray-300 mb-1">Insufficient price history</p>
        <p className="text-xs">
          No synthetic chart — current YES {(market.yesPrice * 100).toFixed(0)}¢ · NO{" "}
          {(market.noPrice * 100).toFixed(0)}¢
        </p>
      </div>
    );
  }

  const yesPct = chartHistory.map((h) => h.yesPrice * 100);
  const noPct = chartHistory.map((h) => h.noPrice * 100);

  const allPct = [...yesPct, ...noPct].filter((v) => Number.isFinite(v));
  let minP = allPct.length ? Math.min(...allPct) : 0;
  let maxP = allPct.length ? Math.max(...allPct) : 100;
  minP = Math.max(0, minP - 4);
  maxP = Math.min(100, maxP + 4);
  if (!Number.isFinite(minP) || !Number.isFinite(maxP)) {
    minP = 0;
    maxP = 100;
  }
  if (maxP <= minP) {
    const mid = (minP + maxP) / 2 || 50;
    minP = Math.max(0, mid - 5);
    maxP = Math.min(100, mid + 5);
    if (maxP <= minP) maxP = minP + 10;
  }
  const range = maxP - minP;

  const generatePath = (data: number[]) => {
    if (data.length === 0) return '';
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(data.length - 1, 1);

    return data
      .map((value, index) => {
        const x = index * stepX;
        const safe = Number.isFinite(value) ? value : minP + range / 2;
        const yNorm = (safe - minP) / range;
        const y = height - Math.max(0, Math.min(1, yNorm)) * height;
        const fx = Number.isFinite(x) ? x : 0;
        const fy = Number.isFinite(y) ? y : height / 2;
        return `${index === 0 ? 'M' : 'L'} ${fx.toFixed(3)} ${fy.toFixed(3)}`;
      })
      .join(' ');
  };

  const generateAreaPath = (data: number[]) => {
    if (data.length === 0) return '';
    const linePath = generatePath(data);
    const width = 100;
    const height = 100;
    const stepX = width / Math.max(data.length - 1, 1);
    const lastX = (data.length - 1) * stepX;

    return `${linePath} L ${lastX.toFixed(3)} ${height} L 0 ${height} Z`;
  };

  const pathYes = generatePath(yesPct);
  const pathNo = generatePath(noPct);
  const areaYes = generateAreaPath(yesPct);
  const areaNo = generateAreaPath(noPct);

  const timeRanges: TimeRange[] = ['1H', '6H', '24H', '7D'];

  const yEnd = unitProbability(market.yesPrice, 0.5);
  const nEnd = unitProbability(market.noPrice, 0.5);
  const sumEnd = yEnd + nEnd;
  const currentYesPercent =
    sumEnd > 0 && Math.abs(sumEnd - 1) > 0.02 ? (yEnd / sumEnd) * 100 : yEnd * 100;
  const currentNoPercent =
    sumEnd > 0 && Math.abs(sumEnd - 1) > 0.02 ? (nEnd / sumEnd) * 100 : nEnd * 100;

  const hasRealHistory = baseHistory.length > 0 && filteredHistory.length > 0;

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-syne font-bold text-xl">Probability Chart</h2>

        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-sm font-semibold rounded transition-all ${
                timeRange === r ? 'bg-brand-green text-brand-bg' : 'text-gray-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand-green rounded-full"></div>
            <span className="text-sm font-semibold">YES</span>
          </div>
          <span className="font-mono text-2xl font-bold text-brand-green">
            {Number.isFinite(currentYesPercent) ? currentYesPercent.toFixed(0) : '—'}%
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, Number.isFinite(currentYesPercent) ? currentYesPercent : 0))}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-semibold">NO</span>
          </div>
          <span className="font-mono text-2xl font-bold text-red-500">
            {Number.isFinite(currentNoPercent) ? currentNoPercent.toFixed(0) : '—'}%
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, Number.isFinite(currentNoPercent) ? currentNoPercent : 0))}%`,
            }}
          />
        </div>
      </div>

      {!hasRealHistory && (
        <p className="text-xs text-gray-500 mb-2">
          Estimated probability trend (no historical tape yet for this market).
        </p>
      )}

      <div className="relative bg-white/5 rounded-lg p-4 pl-10" style={{ height: '300px' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {[0, 25, 50, 75, 100].map((gy) => (
            <line
              key={gy}
              x1="0"
              y1={gy}
              x2="100"
              y2={gy}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.2"
            />
          ))}

          {areaYes ? <path d={areaYes} fill="#00FF87" fillOpacity="0.15" /> : null}
          {areaNo ? <path d={areaNo} fill="#EF4444" fillOpacity="0.15" /> : null}

          {pathYes ? (
            <path d={pathYes} fill="none" stroke="#00FF87" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          ) : null}
          {pathNo ? (
            <path d={pathNo} fill="none" stroke="#EF4444" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          ) : null}
        </svg>

        <div className="absolute left-0 top-0 bottom-0 w-9 flex flex-col justify-between text-xs text-gray-500 font-mono py-1">
          <span>{maxP.toFixed(0)}%</span>
          <span>{((maxP + minP) / 2).toFixed(0)}%</span>
          <span>{minP.toFixed(0)}%</span>
        </div>
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>{timeRange} ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}
