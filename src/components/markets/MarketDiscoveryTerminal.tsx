import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { SeedMarket } from "~/data/seedMarkets";
import { buildMarketDiscoveryLanes } from "~/lib/markets/marketDiscoveryLanes";
import { MarketCardCompact } from "./MarketCardCompact";

export function MarketDiscoveryTerminal({ markets }: { markets: SeedMarket[] }) {
  const navigate = useNavigate();
  const lanes = useMemo(() => buildMarketDiscoveryLanes(markets), [markets]);

  if (lanes.length === 0) return null;

  return (
    <div className="mb-8 space-y-6">
      <div>
        <h2 className="font-syne text-xl font-bold text-white sm:text-2xl">
          Market discovery
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Live lanes from catalog quotes and protocol activity — no synthetic tape.
        </p>
      </div>
      {lanes.map((lane) => (
        <section key={lane.id}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brand-cyan">
                {lane.label}
              </h3>
              <p className="text-[11px] text-gray-600">{lane.description}</p>
            </div>
            <span className="font-mono text-[10px] text-gray-500">{lane.markets.length} markets</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {lane.markets.map((m) => (
              <div key={m.id} className="w-[min(100%,280px)] shrink-0 sm:w-[260px]">
                <MarketCardCompact
                  market={m}
                  onClick={() =>
                    navigate({ to: "/markets/$marketId", params: { marketId: m.id } })
                  }
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
