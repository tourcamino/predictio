import { Link } from "@tanstack/react-router";
import {
  Clock,
  TrendingDown,
  TrendingUp,
  Trophy,
  Loader2,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import {
  derivePositionLifecycle,
  toCanonicalTradingBucket,
  isAwaitingOracleSettlement,
  type CanonicalTradingBucket,
  type PositionLifecycleBucket,
} from "~/lib/position/derivePositionLifecycle";
import { MarketLifecycleState } from "~/lib/market/marketLifecycleStateMachine";
import type { Market } from "~/data/mockMarkets";
import { formatApiDateTime } from "~/utils/parseApiDate";
import { ShareButton } from "~/components/ShareButton";
import { generatePredictionShareText } from "~/utils/shareUtils";

const CANONICAL_BUCKET_ORDER: CanonicalTradingBucket[] = ["OPEN", "SETTLING", "RESOLVED"];

const CANONICAL_HEADINGS: Record<CanonicalTradingBucket, string> = {
  OPEN: "Open & live",
  SETTLING: "Awaiting oracle settlement",
  RESOLVED: "Resolved",
};

type Row = {
  order: UserOrderRow;
  market: Market | null | undefined;
  lifecycle: ReturnType<typeof derivePositionLifecycle>;
};

function PhaseBadge({ phase }: { phase: Row["lifecycle"]["eventPhase"] }) {
  const map = {
    upcoming: { label: "Upcoming", className: "bg-blue-500/20 text-blue-300" },
    live: { label: "Live", className: "bg-red-500/20 text-red-300" },
    ended: { label: "Ended", className: "bg-amber-500/20 text-amber-200" },
    settled: { label: "Settled", className: "bg-brand-green/20 text-brand-green" },
  } as const;
  const s = map[phase];
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.className}`}>
      {phase === "live" && <Radio className="w-3 h-3 inline mr-1 animate-pulse" />}
      {s.label}
    </span>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`font-mono font-semibold ${valueClass ?? "text-white"}`}>{value}</p>
    </div>
  );
}


function PositionCard({ row }: { row: Row }) {
  const { order, market, lifecycle } = row;
  const title =
    order.market?.event?.trim() ||
    (market ? `${market.teamA} vs ${market.teamB}` : order.marketId);
  const pnl =
    lifecycle.realizedPnl != null ? lifecycle.realizedPnl : lifecycle.unrealizedPnl;
  const pnlPositive = pnl >= 0;
  const shares = order.shares ?? 0;
  const avgPrice = order.avgPrice ?? 0;
  const odds = avgPrice > 0 ? 1 / avgPrice : 0;

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-brand-green/25 transition-colors">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <PhaseBadge phase={lifecycle.eventPhase} />
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  order.outcome.toUpperCase() === "YES"
                    ? "bg-brand-green/20 text-brand-green"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {order.outcome.toUpperCase()}
              </span>
              {isAwaitingOracleSettlement(order, market) && (
                <span
                  className="px-2 py-0.5 rounded text-xs bg-amber-500/15 text-amber-300 flex items-center gap-1"
                  title="Match ended on schedule; payout waits for Azuro oracle resolution."
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Awaiting oracle settlement
                </span>
              )}
              {lifecycle.settlementPending && !isAwaitingOracleSettlement(order, market) && (
                <span className="px-2 py-0.5 rounded text-xs bg-amber-500/15 text-amber-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Settlement pending
                </span>
              )}
              {lifecycle.isWinner === true && (
                <span className="px-2 py-0.5 rounded text-xs bg-brand-green/20 text-brand-green flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Won
                </span>
              )}
              {lifecycle.isLoser === true && (
                <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Lost
                </span>
              )}
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
            {market?.league && (
              <p className="text-xs text-gray-500 mt-0.5">
                {market.sportEmoji} {market.league}
              </p>
            )}
          </div>
          <span className="text-xs font-mono text-gray-500">{lifecycle.bucketLabel}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <Stat label="Stake" value={`$${order.amount.toFixed(2)}`} />
          <Stat
            label="Entry → Now"
            value={`${(lifecycle.entryProbability * 100).toFixed(0)}¢ → ${(lifecycle.currentProbability * 100).toFixed(0)}¢`}
          />
          <Stat
            label={lifecycle.realizedPnl != null ? "Realized P&L" : "Mark P&L"}
            value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
            valueClass={pnlPositive ? "text-brand-green" : "text-red-400"}
          />
          <Stat label="Max payout" value={`$${lifecycle.maxPayout.toFixed(2)}`} />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          {lifecycle.kickoffAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Kickoff {formatApiDateTime(lifecycle.kickoffAt)}
            </span>
          )}
          {lifecycle.closesAt && (
            <span>Trading locked {formatApiDateTime(lifecycle.closesAt)}</span>
          )}
          {lifecycle.resolvedAt && (
            <span className="text-brand-green/80">
              Settled {formatApiDateTime(lifecycle.resolvedAt)}
            </span>
          )}
          {lifecycle.marketLifecycle === MarketLifecycleState.RESOLVING && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              Oracle / resolution in progress
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/markets/$marketId"
            params={{ marketId: order.marketId }}
            className="text-xs px-3 py-1.5 border border-white/15 rounded-lg hover:bg-white/5"
          >
            View market
          </Link>
          <Link
            to="/trading/position/$id"
            params={{ id: order.id }}
            className="text-xs px-3 py-1.5 border border-brand-green/30 text-brand-green rounded-lg hover:bg-brand-green/10"
          >
            Position detail
          </Link>
          <ShareButton
            text={generatePredictionShareText({
              marketName: title,
              teamA: market?.teamA ?? "Team A",
              teamB: market?.teamB ?? "Team B",
              outcome: order.outcome.toUpperCase(),
              amount: order.amount,
              odds,
              potentialWin: shares,
              sportEmoji: market?.sportEmoji ?? "⚽",
              league: market?.league ?? "",
            })}
            url={typeof window !== "undefined" ? window.location.origin : ""}
            variant="ghost"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

export function PositionLifecycleBoard({
  positions,
  marketById,
}: {
  positions: UserOrderRow[];
  marketById: Record<string, Market | null | undefined>;
}) {
  const rows: Row[] = positions.map((order) => {
    const market = marketById[order.marketId] ?? null;
    return { order, market, lifecycle: derivePositionLifecycle(order, market) };
  });

  const grouped: Record<CanonicalTradingBucket, Row[]> = {
    OPEN: [],
    SETTLING: [],
    RESOLVED: [],
  };
  for (const row of rows) {
    const key = toCanonicalTradingBucket(row.lifecycle.bucket, row.order.status);
    grouped[key].push(row);
  }
  const nonEmptyBuckets = CANONICAL_BUCKET_ORDER.filter((b) => grouped[b].length > 0);

  if (rows.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">No predictions yet</p>
        <p className="text-sm text-gray-500">Open a market and place your first paper trade.</p>
        <Link
          to="/markets"
          className="inline-block mt-4 px-6 py-2 bg-brand-green text-brand-bg font-bold rounded-lg"
        >
          Browse markets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="p-4 rounded-lg border border-brand-green/20 bg-brand-green/5 text-sm text-gray-300">
        <p className="font-semibold text-brand-green mb-1">Canonical surfaces</p>
        <p>
          <strong className="text-white/90">Trading</strong> = all positions & settlement state.
          <strong className="text-white/90"> Portfolio</strong> = PnL & net worth.
          <strong className="text-white/90"> Wallet → Activity</strong> = immutable ledger.
        </p>
        <p className="text-xs text-gray-500 mt-2">Paper trading environment · football markets</p>
      </div>

      {nonEmptyBuckets.map((bucket) => (
        <section key={bucket}>
          <h3 className="font-syne font-bold text-lg mb-3 flex items-center gap-2">
            {bucket === "OPEN" && <TrendingUp className="w-5 h-5 text-brand-green" />}
            {bucket === "SETTLING" && (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            )}
            {CANONICAL_HEADINGS[bucket]}
            <span className="text-sm font-normal text-gray-500">
              ({grouped[bucket].length})
            </span>
          </h3>
          <div className="space-y-3">
            {grouped[bucket].map((row) => (
              <PositionCard key={row.order.id} row={row} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
