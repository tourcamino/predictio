import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import type { Market } from "~/data/mockMarkets";
import {
  formatClosesIn,
  getMarketProtocolLabel,
  isOracleStaleForDisplay,
  marketSupportsDraw,
} from "~/lib/market/marketProtocolStatus";
import { formatApiDateTime } from "~/utils/parseApiDate";

export function MarketOracleStatusPanel({
  market,
  lastUpdatedAt,
}: {
  market: Market;
  lastUpdatedAt?: Date;
}) {
  const label = getMarketProtocolLabel(market);
  const stale = isOracleStaleForDisplay(market);
  const closesIn = formatClosesIn(market.closesAt);
  const drawSupported = marketSupportsDraw(market);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span
          className={`px-2 py-1 rounded font-bold ${
            label === "LIVE MARKET"
              ? "bg-red-500/20 text-red-300"
              : label === "ORACLE PENDING"
                ? "bg-amber-500/20 text-amber-200"
                : label === "RESOLVED"
                  ? "bg-brand-green/20 text-brand-green"
                  : "bg-blue-500/20 text-blue-300"
          }`}
        >
          {label}
        </span>
        <span className="text-gray-500">
          Market {market.status}
          {market.lifecycleState ? ` · lifecycle ${market.lifecycleState}` : ""}
        </span>
        {lastUpdatedAt && (
          <span className="text-gray-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated {formatApiDateTime(lastUpdatedAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
        {market.closesAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Closes {formatApiDateTime(market.closesAt)}
            {closesIn ? ` · ${closesIn}` : null}
          </span>
        )}
        {market.resolved_at && (
          <span className="text-brand-green/80">
            Resolved {formatApiDateTime(market.resolved_at)}
          </span>
        )}
      </div>

      {stale && (
        <div
          className="px-4 py-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex gap-2"
          role="status"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-100 text-sm">
              Event finished — oracle resolution pending
            </p>
            <p className="text-xs text-amber-200/80 mt-1">
              Trading is closed on schedule. Payouts post when Azuro reports Resolved/Finished with a
              winning outcome. Paper settlement polls every few minutes on the server.
            </p>
          </div>
        </div>
      )}

      {!drawSupported && market.percentDraw === 0 && (
        <p className="text-xs text-gray-500 border border-white/10 rounded-lg px-3 py-2">
          Draw (X) is not offered on this market — only home/away outcomes settle via binary oracle.
        </p>
      )}
    </div>
  );
}
