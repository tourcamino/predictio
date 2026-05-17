import type { Market } from "~/data/mockMarkets";
import { formatCurrency } from "~/utils/marketUtils";

/** Real protocol metrics only — no synthetic deltas. */
export function MarketActivityStrip({
  market,
  lastUpdatedAt,
}: {
  market: Market;
  lastUpdatedAt?: Date;
}) {
  const liq = market.liquidity;
  const items = [
    {
      label: "Volume",
      value: market.volume > 0 ? formatCurrency(market.volume) : "—",
    },
    {
      label: "24h pool vol",
      value: liq?.volume24h != null && liq.volume24h > 0 ? formatCurrency(liq.volume24h) : "—",
    },
    {
      label: "Predictions",
      value: market.predictions != null ? String(market.predictions) : "—",
    },
    {
      label: "24h trades",
      value: liq?.trades24h != null ? String(liq.trades24h) : "—",
    },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
          Protocol activity
        </p>
        {lastUpdatedAt && (
          <p className="text-[10px] font-mono text-gray-600">
            Feed {lastUpdatedAt.toLocaleTimeString()}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-white/10 px-2 py-2 text-center">
            <p className="text-[10px] uppercase text-gray-600">{it.label}</p>
            <p className="font-mono text-sm font-bold text-white">{it.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
