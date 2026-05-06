import { TrendingUp, TrendingDown, Target, Trophy } from 'lucide-react';

const SPORT_EMOJIS: Record<string, string> = {
  'NFL': '🏈',
  'NBA': '🏀',
  'MLB': '⚾',
  'NHL': '🏒',
  'Soccer': '⚽',
  'Football': '⚽',
  'MMA': '🥊',
  'Boxing': '🥊',
  'Tennis': '🎾',
  'Golf': '⛳',
  'F1': '🏎️',
  'Cricket': '🏏',
  'Rugby': '🏉',
};

interface SportStat {
  sport: string;
  predictions: number;
  wins: number;
  losses: number;
  totalInvested: number;
  totalPnL: number;
  winRate: number;
  roi: number;
}

interface LeagueStat {
  league: string;
  sport: string;
  predictions: number;
  wins: number;
  losses: number;
  totalInvested: number;
  totalPnL: number;
  winRate: number;
  roi: number;
}

interface AccuracyPoint {
  weekStart: Date;
  predictions: number;
  wins: number;
  winRate: number;
}

interface PredictionAnalyticsChartsProps {
  sportBreakdown: SportStat[];
  leagueBreakdown: LeagueStat[];
  accuracyOverTime: AccuracyPoint[];
}

export function PredictionAnalyticsCharts({
  sportBreakdown,
  leagueBreakdown,
  accuracyOverTime,
}: PredictionAnalyticsChartsProps) {
  if (sportBreakdown.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-gray-400">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No prediction data available yet</p>
      </div>
    );
  }

  const bestSport = sportBreakdown[0];
  const maxROI = Math.max(...sportBreakdown.map(s => Math.abs(s.roi)));

  return (
    <div className="space-y-8">
      {/* Accuracy Over Time Chart */}
      {accuracyOverTime.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-syne font-bold text-xl mb-4">Accuracy Over Time</h3>
          <AccuracyChart data={accuracyOverTime} />
        </div>
      )}

      {/* Sport Performance Breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="font-syne font-bold text-xl mb-2">Performance by Sport</h3>
          <p className="text-sm text-gray-400">
            Prediction accuracy and ROI broken down by sport
          </p>
        </div>

        {/* Best Sport Highlight */}
        {bestSport.roi > 0 && (
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-brand-green" />
              <span className="text-sm text-gray-400">Best Performing Sport</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{SPORT_EMOJIS[bestSport.sport] || '🎯'}</span>
              <div>
                <div className="font-bold text-lg">{bestSport.sport}</div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-brand-green font-mono font-bold">
                    +{bestSport.roi.toFixed(1)}% ROI
                  </span>
                  <span className="text-brand-cyan font-mono font-semibold">
                    {bestSport.winRate.toFixed(0)}% Win Rate
                  </span>
                  <span className="text-gray-400">
                    {bestSport.predictions} predictions
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sport List */}
        <div className="space-y-3">
          {sportBreakdown.map((sport) => {
            const isPositive = sport.roi >= 0;
            const barWidth = maxROI > 0 ? (Math.abs(sport.roi) / maxROI) * 100 : 0;

            return (
              <div
                key={sport.sport}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{SPORT_EMOJIS[sport.sport] || '🎯'}</span>
                    <div>
                      <div className="font-semibold">{sport.sport}</div>
                      <div className="text-xs text-gray-400">
                        {sport.predictions} prediction{sport.predictions !== 1 ? 's' : ''} · 
                        {sport.wins}W-{sport.losses}L
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 font-mono font-bold text-lg ${
                      isPositive ? 'text-brand-green' : 'text-red-500'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {isPositive ? '+' : ''}{sport.roi.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">
                      {sport.winRate.toFixed(0)}% accuracy
                    </div>
                  </div>
                </div>

                {/* ROI Bar */}
                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                      isPositive ? 'bg-brand-green' : 'bg-red-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* League Breakdown (if available) */}
      {leagueBreakdown.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="font-syne font-bold text-xl mb-2">Performance by League</h3>
            <p className="text-sm text-gray-400">
              Detailed breakdown by specific leagues and competitions
            </p>
          </div>

          <div className="space-y-2">
            {leagueBreakdown.slice(0, 10).map((league) => (
              <div
                key={`${league.sport}-${league.league}`}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{SPORT_EMOJIS[league.sport] || '🎯'}</span>
                  <div>
                    <div className="font-semibold text-sm">{league.league}</div>
                    <div className="text-xs text-gray-400">
                      {league.predictions} predictions · {league.winRate.toFixed(0)}% win rate
                    </div>
                  </div>
                </div>
                <div className={`font-mono font-bold ${
                  league.roi >= 0 ? 'text-brand-green' : 'text-red-500'
                }`}>
                  {league.roi >= 0 ? '+' : ''}{league.roi.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccuracyChart({ data }: { data: AccuracyPoint[] }) {
  const maxWinRate = 100;
  const avgWinRate = data.reduce((sum, d) => sum + d.winRate, 0) / data.length;
  const xSpan = Math.max(1, data.length - 1);

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

          {/* Area under curve */}
          <path
            d={
              data
                .map((d, i) => {
                  const x = (i / xSpan) * 100;
                  const y = 100 - d.winRate;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ") + ` L 100 100 L 0 100 Z`
            }
            fill="#00FF87"
            fillOpacity="0.1"
          />

          {/* Line */}
          <path
            d={data
              .map((d, i) => {
                const x = (i / xSpan) * 100;
                const y = 100 - d.winRate;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#00FF87"
            strokeWidth="2"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / xSpan) * 100;
            const y = 100 - d.winRate;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
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
          <span className="text-gray-400">Win Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-brand-cyan" />
          <span className="text-gray-400">Average: {avgWinRate.toFixed(1)}%</span>
        </div>
        <div className="text-gray-400">
          {data.length} week{data.length !== 1 ? 's' : ''} of data
        </div>
      </div>
    </div>
  );
}
