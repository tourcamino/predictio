import { useMemo } from "react";
import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/trading/mapDbOrderToTradingPosition";
import type { Position } from "~/store/tradingStore";
import { useTradingStore } from "~/store/tradingStore";
import {
  aggregateDeskStats,
  buildTraderDeskRow,
  groupTraderDeskRows,
} from "~/lib/trading/traderPositionDesk";
import { TraderPositionCard } from "./TraderPositionCard";

export function TraderPositionsBoard({
  positions,
  orders,
  marketById,
  selectedPositionId,
  onSelect,
  onSell,
}: {
  positions: Position[];
  orders: UserOrderRow[];
  marketById: Record<string, Market | null | undefined>;
  selectedPositionId: string | null;
  onSelect: (id: string) => void;
  onSell: (id: string) => void;
}) {
  const marketPrices = useTradingStore((s) => s.marketPrices);
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const rows = useMemo(
    () =>
      positions.map((p) =>
        buildTraderDeskRow(
          p,
          marketById[p.marketId] ?? null,
          orderById.get(p.id) ?? null,
          marketPrices[p.marketId],
        ),
      ),
    [positions, marketById, orderById, marketPrices],
  );

  const groups = useMemo(() => groupTraderDeskRows(rows), [rows]);

  if (positions.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
        No open positions
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.section}>
          <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            {group.label}
            <span className="ml-2 text-gray-600">({group.rows.length})</span>
          </h2>
          <div className="flex flex-col gap-3">
            {group.rows.map((row) => (
              <TraderPositionCard
                key={row.position.id}
                row={row}
                isSelected={selectedPositionId === row.position.id}
                onSelect={() => onSelect(row.position.id)}
                onSell={row.canSell ? () => onSell(row.position.id) : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export { aggregateDeskStats };
