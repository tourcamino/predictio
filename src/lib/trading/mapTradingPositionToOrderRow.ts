import type { Position } from "~/store/tradingStore";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";

/** Map trading UI row → lifecycle narrative input (no extra API). */
export function mapTradingPositionToOrderRow(position: Position): UserOrderRow {
  const status =
    position.status === "resolved"
      ? "resolved"
      : position.status === "cancelled" || position.status === "refunded"
        ? position.status
        : "open";

  return {
    id: position.id,
    marketId: position.marketId,
    outcome: position.outcome,
    shares: position.shares,
    avgPrice: position.entryPrice,
    amount: position.costBasis,
    status,
    pnl: position.unrealizedPnl,
    resolvedAt: position.resolvedAt ?? null,
    market: {
      event: position.marketName,
      closesAt: position.marketEndsAt,
      status: position.status === "resolved" ? "resolved" : "open",
      resolvedAt: position.resolvedAt ?? null,
    },
  } as UserOrderRow;
}
