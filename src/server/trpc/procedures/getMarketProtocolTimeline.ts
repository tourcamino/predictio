import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export type ProtocolTimelineEventKind =
  | "market_created"
  | "position_opened"
  | "position_closed"
  | "settlement"
  | "refund"
  | "liquidity";

export type ProtocolTimelineEvent = {
  id: string;
  kind: ProtocolTimelineEventKind;
  label: string;
  detail: string;
  at: string;
  walletHint?: string;
  amountUsd?: number;
};

function maskWallet(w: string): string {
  if (w.length < 10) return w;
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

export const getMarketProtocolTimeline = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      limit: z.number().min(1).max(40).default(24),
    }),
  )
  .query(async ({ input }) => {
    const { marketId, limit } = input;

    const market = await db.market.findUnique({
      where: { id: marketId },
      select: {
        createdAt: true,
        closesAt: true,
        resolvedAt: true,
        status: true,
        predictions: true,
        volume: true,
      },
    });

    const [orders, txs] = await Promise.all([
      db.order.findMany({
        where: { marketId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          wallet: true,
          outcome: true,
          amount: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
        },
      }),
      db.transaction.findMany({
        where: { marketId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          wallet: true,
          createdAt: true,
        },
      }),
    ]);

    const events: ProtocolTimelineEvent[] = [];

    if (market) {
      events.push({
        id: `m-created-${marketId}`,
        kind: "market_created",
        label: "Market indexed",
        detail: `Catalog · ${market.predictions} predictions · $${Math.round(market.volume).toLocaleString()} volume`,
        at: market.createdAt.toISOString(),
      });
    }

    for (const o of orders) {
      events.push({
        id: `order-open-${o.id}`,
        kind: "position_opened",
        label: "Position opened",
        detail: `${o.outcome} · $${o.amount.toFixed(2)} paper`,
        at: o.createdAt.toISOString(),
        walletHint: maskWallet(o.wallet),
        amountUsd: o.amount,
      });
      if (o.status === "resolved" && o.resolvedAt) {
        events.push({
          id: `order-res-${o.id}`,
          kind: "settlement",
          label: "Position settled",
          detail: `${o.outcome} closed on protocol`,
          at: o.resolvedAt.toISOString(),
          walletHint: maskWallet(o.wallet),
        });
      }
    }

    for (const t of txs) {
      const type = t.type.toLowerCase();
      let kind: ProtocolTimelineEventKind = "settlement";
      let label = "Ledger entry";

      if (type.includes("settlement_win")) {
        kind = "settlement";
        label = "Payout (win)";
      } else if (type.includes("settlement_loss")) {
        kind = "settlement";
        label = "Settlement (loss)";
      } else if (type.includes("refund")) {
        kind = "refund";
        label = "Refund";
      } else if (type.includes("position_open")) {
        kind = "position_opened";
        label = "Ledger: position open";
      } else if (type.includes("position_sell")) {
        kind = "position_closed";
        label = "Ledger: partial close";
      } else if (type.includes("lp_")) {
        kind = "liquidity";
        label = "Liquidity event";
      }

      events.push({
        id: `tx-${t.id}`,
        kind,
        label,
        detail: t.type.replace(/_/g, " "),
        at: t.createdAt.toISOString(),
        walletHint: maskWallet(t.wallet),
        amountUsd: Math.abs(t.amount),
      });
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const deduped: ProtocolTimelineEvent[] = [];
    const seen = new Set<string>();
    for (const e of events) {
      const key = `${e.kind}:${e.at}:${e.walletHint ?? ""}:${e.amountUsd ?? 0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(e);
      if (deduped.length >= limit) break;
    }

    return {
      events: deduped,
      generatedAt: new Date().toISOString(),
      marketStatus: market?.status ?? null,
    };
  });
