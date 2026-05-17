import type { Market } from "~/data/mockMarkets";
import type { SettlementDiagnosticEntry } from "~/lib/settlement/settlementDiagnostics";
import type { ProtocolTimelineEvent } from "~/server/trpc/procedures/getMarketProtocolTimeline";

export type MarketPulseMetric = {
  label: string;
  value: string;
  hint?: string;
};

/** Real market telemetry only — no synthetic deltas. */
export function deriveMarketPulse(
  market: Market,
  opts?: {
    diagnostic?: SettlementDiagnosticEntry | null;
    oracleCheckedAt?: string | null;
    recentEvents?: ProtocolTimelineEvent[];
    lastQuoteAt?: number | null;
  },
): MarketPulseMetric[] {
  const yes = market.yesPrice ?? 0.5;
  const no = market.noPrice ?? 1 - yes;
  const spreadCents = Math.round(Math.abs(yes + no - 1) * 100 * 100) / 100;
  const spread =
    spreadCents > 0.5 ? `${spreadCents.toFixed(1)}¢ imbalance` : "Tight 1X2";

  const events = opts?.recentEvents ?? [];
  const lastFill = events.find(
    (e) =>
      e.kind === "position_opened" ||
      e.kind === "position_closed" ||
      e.kind === "settlement",
  );
  const lastExecution = lastFill
    ? `${lastFill.label} · ${new Date(lastFill.at).toLocaleTimeString()}`
    : market.predictions != null && market.predictions > 0
      ? `${market.predictions} protocol fills`
      : "—";

  const vol =
    market.volume > 0
      ? `$${Math.round(market.volume).toLocaleString()}`
      : market.liquidity?.volume24h
        ? `$${Math.round(market.liquidity.volume24h).toLocaleString()} /24h`
        : "—";

  const oracleState = opts?.diagnostic?.azuroGameState ?? "—";
  const oracleFresh = opts?.oracleCheckedAt
    ? new Date(opts.oracleCheckedAt).toLocaleTimeString()
    : opts?.lastQuoteAt
      ? new Date(opts.lastQuoteAt).toLocaleTimeString()
      : "—";

  const uniqueWallets = new Set(
    events
      .map((e) => e.walletHint)
      .filter((w): w is string => Boolean(w)),
  );
  const traders =
    uniqueWallets.size > 0
      ? String(uniqueWallets.size)
      : market.predictions != null
        ? String(Math.min(market.predictions, 9999))
        : "—";

  return [
    { label: "Spread", value: spread, hint: "YES/NO vs parity" },
    { label: "Last execution", value: lastExecution },
    { label: "Volume", value: vol },
    { label: "Oracle", value: oracleState, hint: `Seen ${oracleFresh}` },
    { label: "Active traders", value: traders, hint: "Distinct wallets on tape" },
  ];
}
