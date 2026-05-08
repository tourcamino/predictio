import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Market } from "~/data/mockMarkets";
import { SEED_MARKETS } from "~/data/seedMarkets";
import { MarketCard } from "./MarketCard";
import { seedMarketToLiveMarket } from "~/utils/seedMarketToLiveMarket";
import { fetchCuratedMarketsFromApi } from "~/utils/curatedMarketsApi";

interface RelatedMarketsProps {
  currentMarket: Market;
}

export function RelatedMarkets({ currentMarket }: RelatedMarketsProps) {
  const navigate = useNavigate();

  const marketsQuery = useQuery({
    queryKey: ["curatedMarkets", "related"],
    queryFn: fetchCuratedMarketsFromApi,
    staleTime: 60_000,
  });

  const relatedMarkets = useMemo(() => {
    if (marketsQuery.isPending && !marketsQuery.data) {
      return [];
    }

    const rows = marketsQuery.data?.markets;
    let adapted: Market[];

    if (rows && rows.length > 0) {
      adapted = rows.map(seedMarketToLiveMarket);
    } else {
      adapted = SEED_MARKETS.filter(
        (s) =>
          s.sport === currentMarket.sport ||
          (currentMarket.sport === "all" && s.sport === "football"),
      )
        .slice(0, 12)
        .map(seedMarketToLiveMarket);
    }

    return adapted
      .filter(
        (m) =>
          m.id !== currentMarket.id &&
          (m.sport === currentMarket.sport ||
            m.league === currentMarket.league ||
            currentMarket.sport === "all"),
      )
      .slice(0, 3);
  }, [
    marketsQuery.isPending,
    marketsQuery.data,
    currentMarket.id,
    currentMarket.sport,
    currentMarket.league,
  ]);

  const loading = marketsQuery.isPending && !marketsQuery.data;

  if (!loading && relatedMarkets.length === 0) {
    return null;
  }

  const handleMarketClick = (marketId: string) => {
    navigate({ to: "/markets/$marketId", params: { marketId } });
  };

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-2xl mb-6">Related Markets</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`rel-sk-${i}`}
                className="h-52 rounded-lg bg-white/5 border border-white/10 animate-pulse"
              />
            ))
          : relatedMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onClick={() => handleMarketClick(market.id)}
              />
            ))}
      </div>
    </div>
  );
}
