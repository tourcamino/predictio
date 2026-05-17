import type { Market } from "~/data/mockMarkets";
import { formatCurrency } from "~/utils/marketUtils";

export function LiquidityProtocolExplainer({ market }: { market: Market }) {
  const liq = market.liquidity;
  const pool = liq?.totalPool;
  const vol = liq?.volume24h ?? market.volume;
  const trades = liq?.trades24h;
  const predictions = market.predictions;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
      <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-brand-cyan">
        Liquidity model
      </p>
      <p className="mb-4 text-sm text-gray-400">
        Your trade size is <strong className="text-white/90">exposure against the pool</strong>, not
        a deposit into the headline liquidity number.
      </p>
      <div className="space-y-3 text-sm">
        <Row
          label="AMM / protocol pool"
          value={pool != null ? formatCurrency(pool) : "—"}
          hint="Capital backing YES/NO quotes on this market"
        />
        <Row
          label="24h market volume"
          value={vol != null && vol > 0 ? formatCurrency(vol) : "—"}
          hint="Observed trading activity (real aggregate)"
        />
        <Row
          label="Open interest signal"
          value={predictions != null ? `${predictions} predictions` : "—"}
          hint="Distinct positions on this market"
        />
        <Row
          label="Your stake"
          value="Shown on position"
          hint="Not added to LP TVL — it is trader exposure"
        />
      </div>
      <p className="mt-4 border-t border-white/10 pt-3 text-xs text-gray-500">
        LP supplied liquidity (see Liquidity page) is separate from trader exposure. Settlement
        reserves pay winners from protocol accounting after oracle resolution.
      </p>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <div className="flex justify-between gap-2">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono font-semibold text-white">{value}</span>
      </div>
      <p className="mt-1 text-[10px] text-gray-600">{hint}</p>
    </div>
  );
}
