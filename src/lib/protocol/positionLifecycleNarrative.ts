import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import {
  derivePositionLifecycle,
  isAwaitingOracleSettlement,
  type PositionLifecycleView,
} from "~/lib/position/derivePositionLifecycle";
import { getMarketProtocolLabel } from "~/lib/market/marketProtocolStatus";
import { MarketLifecycleState } from "~/lib/market/marketLifecycleStateMachine";

export type PipelineStepId =
  | "OPEN"
  | "MARKET_CLOSED"
  | "AWAITING_ORACLE"
  | "SETTLEMENT_PROCESSING"
  | "RESOLVED";

export type PipelineStep = {
  id: PipelineStepId;
  label: string;
  status: "done" | "active" | "pending";
  detail?: string;
};

export type OracleNarrative = {
  headline: string;
  body: string;
  settlementCadence: string;
};

export type ProtocolNextAction = {
  label: string;
  tone: "neutral" | "wait" | "success" | "warning";
};

function formatWhen(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function deriveMarketClockPhase(
  market: Market | null | undefined,
  lifecycle?: PositionLifecycleView,
): "upcoming" | "live" | "closed" | "awaiting_oracle" | "resolved" {
  if (!market && !lifecycle) return "upcoming";
  if (lifecycle?.eventPhase === "settled" || market?.status === "resolved") return "resolved";
  if (lifecycle?.settlementPending) return "awaiting_oracle";
  const closes = lifecycle?.closesAt ?? market?.closesAt ?? null;
  if (closes && closes.getTime() <= Date.now()) {
    if (market?.status === "open" || market?.lifecycleState === "RESOLVING") {
      return "awaiting_oracle";
    }
    return "closed";
  }
  if (lifecycle?.eventPhase === "live" || market?.status === "closing-soon") return "live";
  return "upcoming";
}

export function derivePipelineSteps(
  order: UserOrderRow,
  market: Market | null | undefined,
  lifecycle = derivePositionLifecycle(order, market),
): PipelineStep[] {
  const closed =
    lifecycle.closesAt != null && lifecycle.closesAt.getTime() <= Date.now();
  const awaiting = isAwaitingOracleSettlement(order, market) || lifecycle.settlementPending;
  const resolved = order.status === "resolved" || order.status === "closed";
  const processing = awaiting && !resolved;

  const step = (id: PipelineStepId, label: string, status: PipelineStep["status"], detail?: string) =>
    ({ id, label, status, detail });

  if (resolved) {
    const win =
      lifecycle.isWinner === true
        ? "Win credited to paper balance"
        : lifecycle.isWinner === false
          ? "Loss finalized"
          : "Outcome recorded";
    return [
      step("OPEN", "Position open", "done"),
      step("MARKET_CLOSED", "Market closed", "done"),
      step("AWAITING_ORACLE", "Oracle finalized", "done"),
      step("SETTLEMENT_PROCESSING", "Settlement processed", "done"),
      step("RESOLVED", "Resolved", "done", win),
    ];
  }

  if (processing) {
    return [
      step("OPEN", "Position open", "done"),
      step("MARKET_CLOSED", "Market closed", "done", formatWhen(lifecycle.closesAt)),
      step("AWAITING_ORACLE", "Awaiting oracle", "active", oracleHint(market)),
      step("SETTLEMENT_PROCESSING", "Settlement processing", "pending"),
      step("RESOLVED", "Resolved", "pending"),
    ];
  }

  if (closed) {
    return [
      step("OPEN", "Position open", "done"),
      step("MARKET_CLOSED", "Market closed", "active", formatWhen(lifecycle.closesAt)),
      step("AWAITING_ORACLE", "Awaiting oracle", "pending"),
      step("SETTLEMENT_PROCESSING", "Settlement", "pending"),
      step("RESOLVED", "Resolved", "pending"),
    ];
  }

  if (lifecycle.eventPhase === "live" || lifecycle.bucket === "LIVE") {
    return [
      step("OPEN", "Position open", "active", "Live match window"),
      step("MARKET_CLOSED", "Market closes", "pending", formatWhen(lifecycle.closesAt)),
      step("AWAITING_ORACLE", "Awaiting oracle", "pending"),
      step("SETTLEMENT_PROCESSING", "Settlement", "pending"),
      step("RESOLVED", "Resolved", "pending"),
    ];
  }

  return [
    step("OPEN", "Position open", "active", "Trading open until kickoff close"),
    step("MARKET_CLOSED", "Market closes", "pending", formatWhen(lifecycle.closesAt)),
    step("AWAITING_ORACLE", "Awaiting oracle", "pending"),
    step("SETTLEMENT_PROCESSING", "Settlement", "pending"),
    step("RESOLVED", "Resolved", "pending"),
  ];
}

function oracleHint(market: Market | null | undefined): string {
  const label = getMarketProtocolLabel(market ?? undefined);
  if (label === "ORACLE PENDING") {
    return "Azuro has not finalized this market yet";
  }
  if (market?.lifecycleState === "RESOLVING") {
    return "Oracle reports resolving state";
  }
  return "External oracle lag vs real-world result";
}

export function deriveOracleNarrative(
  order: UserOrderRow,
  market: Market | null | undefined,
  lifecycle = derivePositionLifecycle(order, market),
): OracleNarrative | null {
  if (order.status === "resolved" || order.status === "closed") {
    return {
      headline: "Oracle complete",
      body: "Azuro reported a final outcome. Paper settlement applied this position.",
      settlementCadence: "Settlement cron runs every ~5 minutes on the server.",
    };
  }

  if (!isAwaitingOracleSettlement(order, market) && !lifecycle.settlementPending) {
    return null;
  }

  const prematch =
    market?.lifecycleState?.toLowerCase().includes("prematch") ||
    market?.status === "open";

  return {
    headline: prematch
      ? "Oracle still reports Prematch"
      : "Awaiting Azuro finalization",
    body: prematch
      ? "The match ended on our schedule but Azuro subgraph still shows Prematch. Payouts cannot post until state moves to Resolved/Finished with a winning outcome."
      : "Trading is closed. The protocol polls Azuro and runs settlement when a winner is available.",
    settlementCadence:
      "Settlement cron checks open orders every ~5 minutes. No wallet action required while waiting.",
  };
}

export function deriveProtocolNextAction(
  order: UserOrderRow,
  market: Market | null | undefined,
  lifecycle = derivePositionLifecycle(order, market),
): ProtocolNextAction {
  if (order.status === "resolved") {
    if ((order.pnl ?? 0) > 0) {
      return { label: "Payout applied — review portfolio P&L", tone: "success" };
    }
    if ((order.pnl ?? 0) < 0) {
      return { label: "Loss finalized — no further action", tone: "neutral" };
    }
    return { label: "Void/refund processed", tone: "neutral" };
  }

  if (isAwaitingOracleSettlement(order, market) || lifecycle.settlementPending) {
    return {
      label: "Wait for oracle settlement — typically within minutes after Azuro resolves",
      tone: "wait",
    };
  }

  if (lifecycle.closeable) {
    return {
      label: "You may add size or reduce exposure while market is open",
      tone: "neutral",
    };
  }

  if (lifecycle.marketLifecycle === MarketLifecycleState.LOCKED) {
    return { label: "Match in progress — trading closed until oracle result", tone: "wait" };
  }

  return { label: "Monitor mark-to-market while event is live", tone: "neutral" };
}

export function deriveProbabilityDrift(
  entry: number,
  current: number,
): { deltaPct: number; direction: "up" | "down" | "flat"; label: string } {
  const e = entry > 0 ? entry : 0.5;
  const c = current > 0 ? current : e;
  const deltaPct = e > 0 ? ((c - e) / e) * 100 : 0;
  const direction =
    Math.abs(c - e) < 0.005 ? "flat" : c > e ? "up" : "down";
  const sign = deltaPct >= 0 ? "+" : "";
  return {
    deltaPct,
    direction,
    label:
      direction === "flat"
        ? "Probability unchanged vs entry"
        : `${sign}${deltaPct.toFixed(1)}% vs entry`,
  };
}
