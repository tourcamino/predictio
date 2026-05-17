import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import type { Market } from "~/data/mockMarkets";
import {
  formatClosesIn,
  getMarketProtocolLabel,
  isOracleStaleForDisplay,
  marketSupportsDraw,
} from "~/lib/market/marketProtocolStatus";
import { formatApiDateTime } from "~/utils/parseApiDate";

type Label = ReturnType<typeof getMarketProtocolLabel>;

function labelStyles(label: Label): { badge: string; panel?: string; title: string } {
  switch (label) {
    case "LIVE MARKET":
      return {
        badge: "bg-red-500/20 text-red-300 border-red-500/30",
        title: "Live market — in-play protocol window",
      };
    case "ORACLE PENDING":
      return {
        badge: "bg-amber-500/20 text-amber-200 border-amber-500/30",
        panel:
          "border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent shadow-[0_0_48px_rgba(245,158,11,0.08)]",
        title: "Oracle pending — settlement queue",
      };
    case "RESOLVED":
      return {
        badge: "bg-brand-green/20 text-brand-green border-brand-green/30",
        title: "Resolved — outcome finalized",
      };
    default:
      return {
        badge: "bg-blue-500/15 text-blue-300 border-blue-500/25",
        title: "Upcoming — pre-match window",
      };
  }
}

export function MarketOracleStatusPanel({
  market,
  lastUpdatedAt,
  offCatalog,
}: {
  market: Market;
  lastUpdatedAt?: Date;
  offCatalog?: boolean;
}) {
  const label = getMarketProtocolLabel(market);
  const stale = isOracleStaleForDisplay(market);
  const closesIn = formatClosesIn(market.closesAt);
  const drawSupported = marketSupportsDraw(market);
  const styles = labelStyles(label);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-wide ${styles.badge}`}
        >
          {offCatalog ? "OFF-CATALOG" : label}
        </span>
        {offCatalog && (
          <span className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-mono text-gray-400">
            Not in live catalog — MTM may be stale
          </span>
        )}
        <span className="text-xs font-mono text-gray-500">
          Market {market.status}
          {market.lifecycleState ? ` · ${market.lifecycleState}` : ""}
        </span>
        {lastUpdatedAt && (
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <RefreshCw className="h-3 w-3" />
            {formatApiDateTime(lastUpdatedAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm text-gray-400 sm:grid-cols-2">
        {market.closesAt && (
          <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <Clock className="h-3.5 w-3.5 text-brand-cyan" />
            Closes {formatApiDateTime(market.closesAt)}
            {closesIn ? ` · ${closesIn}` : null}
          </span>
        )}
        {market.resolved_at && (
          <span className="rounded-lg border border-brand-green/20 bg-brand-green/5 px-3 py-2 text-brand-green/90">
            Resolved {formatApiDateTime(market.resolved_at)}
          </span>
        )}
      </div>

      {(stale || label === "ORACLE PENDING") && (
        <div
          className={`relative flex gap-4 overflow-hidden rounded-2xl border p-5 ${
            styles.panel ?? "border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent"
          }`}
          role="status"
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400/80 to-amber-600/20"
            aria-hidden
          />
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-100">{styles.title}</p>
            <p className="mt-1 text-xs text-amber-200/80">
              Trading closed on schedule. Payouts post when Azuro reports Resolved/Finished. Paper
              settlement polls every few minutes — not a wallet defect.
            </p>
            {label === "ORACLE PENDING" && (
              <p className="mt-2 text-[10px] font-mono uppercase tracking-wide text-amber-300/70">
                Diagnostic codes may include ORACLE_PREMATCH · ORACLE_PENDING · ORACLE_DELAYED
              </p>
            )}
          </div>
        </div>
      )}

      {!drawSupported && market.percentDraw === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-500">
          Draw (X) not offered — binary home/away oracle only.
        </p>
      )}
    </div>
  );
}
