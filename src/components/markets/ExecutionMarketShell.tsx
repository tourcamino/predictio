import type { Market } from '~/data/mockMarkets';
import { Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { getMarketStatus } from '~/utils/marketLifecycle';

type Props = {
  market: Market;
};

export function ExecutionMarketHeader({ market }: Props) {
  const lifecycle = getMarketStatus(market);
  const yesPct = Math.round(market.yesPrice * 100);
  const noPct = Math.round(market.noPrice * 100);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-brand-green">
          {market.sportEmoji} {market.league}
        </span>
        {lifecycle === 'open' && market.status === 'closing-soon' && (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            LIVE
          </span>
        )}
        {lifecycle === 'locked' && (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-400">
            In play
          </span>
        )}
        {lifecycle === 'resolved' && (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-gray-300">
            Settled
          </span>
        )}
      </div>

      <h1 className="font-syne font-bold text-2xl sm:text-3xl md:text-4xl leading-tight mb-3">
        {market.teamA}{' '}
        <span className="text-gray-500 font-normal text-xl sm:text-2xl">vs</span>{' '}
        {market.teamB}
      </h1>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {market.start_time.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 sm:p-4">
          <div className="text-xs text-gray-400 mb-1 truncate">{market.teamA}</div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-green-400">{yesPct}%</div>
          <div className="text-xs text-gray-500 mt-1">${market.yesPrice.toFixed(2)} / share</div>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 sm:p-4">
          <div className="text-xs text-gray-400 mb-1 truncate">{market.teamB}</div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-cyan-400">{noPct}%</div>
          <div className="text-xs text-gray-500 mt-1">${market.noPrice.toFixed(2)} / share</div>
        </div>
      </div>
    </div>
  );
}

export function MarketMovementHint({ market }: Props) {
  const imb = market.paperAmm?.imbalancePct ?? 0;
  const util = market.paperAmm?.utilizationPct ?? 0;
  if (Math.abs(imb) < 3 && util < 5) return null;

  const rising = imb > 5;
  const falling = imb < -5;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
      {rising ? (
        <TrendingUp className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
      ) : falling ? (
        <TrendingDown className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      ) : (
        <TrendingUp className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
      )}
      <div>
        {rising && (
          <p className="text-gray-200">
            <span className="text-brand-green font-semibold">{market.teamA}</span> is gaining — traders
            are buying YES side.
          </p>
        )}
        {falling && (
          <p className="text-gray-200">
            <span className="text-cyan-400 font-semibold">{market.teamB}</span> is gaining — market
            pressure on NO.
          </p>
        )}
        {!rising && !falling && util >= 5 && (
          <p className="text-gray-300">Active trading — pool utilization {util.toFixed(0)}%.</p>
        )}
      </div>
    </div>
  );
}

export function QuickProfitStrip({
  market,
  stakeUsd = 100,
}: Props & { stakeUsd?: number }) {
  const yesReturn = stakeUsd / market.yesPrice;
  const noReturn = stakeUsd / market.noPrice;
  const yesProfit = yesReturn - stakeUsd;
  const noProfit = noReturn - stakeUsd;

  return (
    <div className="rounded-xl border border-brand-green/25 bg-brand-green/5 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
        If you stake ${stakeUsd} now
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-400 mb-1">{market.teamA} wins</div>
          <div className="font-mono text-lg font-bold text-brand-green">
            +${yesProfit.toFixed(0)} profit
          </div>
          <div className="text-xs text-gray-500">${yesReturn.toFixed(0)} payout</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">{market.teamB} wins</div>
          <div className="font-mono text-lg font-bold text-cyan-400">+${noProfit.toFixed(0)} profit</div>
          <div className="text-xs text-gray-500">${noReturn.toFixed(0)} payout</div>
        </div>
      </div>
    </div>
  );
}
