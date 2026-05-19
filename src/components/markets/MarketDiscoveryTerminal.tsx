import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { SeedMarket } from "~/data/seedMarkets";
import {
  buildMarketDiscoveryLanes,
  DISCOVERY_LANE_TABS,
  type DiscoveryLaneId,
} from "~/lib/markets/marketDiscoveryLanes";
import { MarketCardCompact } from "./MarketCardCompact";

export function MarketDiscoveryTerminal({ markets }: { markets: SeedMarket[] }) {
  const navigate = useNavigate();
  const lanes = useMemo(() => buildMarketDiscoveryLanes(markets), [markets]);
  const [activeTab, setActiveTab] = useState<DiscoveryLaneId>("live_now");

  const activeLane = useMemo(() => {
    const found = lanes.find((l) => l.id === activeTab);
    return found ?? lanes[0] ?? null;
  }, [lanes, activeTab]);

  if (lanes.length === 0) return null;

  const visibleTabs = DISCOVERY_LANE_TABS.filter((t) => lanes.some((l) => l.id === t.id));

  return (
    <div className="mb-8 space-y-6">
      <div>
        <h2 className="font-syne text-xl font-bold text-white sm:text-2xl">
          Football market terminal
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Continuous inventory — live, swing, and long conviction layers from catalog quotes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {visibleTabs.map((tab) => {
          const count = lanes.find((l) => l.id === tab.id)?.markets.length ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-gray-600">({count})</span>
            </button>
          );
        })}
      </div>

      {activeLane ? (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brand-cyan">
                {activeLane.label}
              </h3>
              <p className="text-[11px] text-gray-600">{activeLane.description}</p>
            </div>
            <span className="font-mono text-[10px] text-gray-500">
              {activeLane.markets.length} markets
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {activeLane.markets.map((m) => (
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
      ) : null}

      {lanes.length > 1 && activeTab === "live_now" ? (
        <div className="space-y-6 pt-4">
          {lanes
            .filter((l) => l.id !== activeTab)
            .slice(0, 3)
            .map((lane) => (
              <section key={lane.id}>
                <div className="mb-2">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                    {lane.label}
                  </h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {lane.markets.slice(0, 4).map((m) => (
                    <div key={m.id} className="w-[220px] shrink-0">
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
      ) : null}
    </div>
  );
}
