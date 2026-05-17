import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  isFootballWeightedMarket,
  isSecondarySportOk,
} from "~/data/copyAnalystAutonomous";
import { mockAnalysts } from "~/data/mockAffiliates";
import { sportEmojiFromLabel } from "~/server/utils/prismaMarket";
import { isFootballFocusProductPhase } from "~/lib/catalog/productCatalogFilter";

const CACHE_MS = 45_000;
let feedCache: { at: number; payload: LiveActivityFeedOutput } | null = null;

export type LiveFeedItemDto = {
  id: string;
  type: string;
  icon: string;
  text: string;
  color: string;
  /** For football-focus UI filter */
  isFootball: boolean;
  at: number;
};

type LiveActivityFeedOutput = { items: LiveFeedItemDto[]; generatedAt: string };

function msAgo(ms: number): Date {
  return new Date(Date.now() - ms);
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function fmtMins(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function marketIsFootball(sport: string, league: string): boolean {
  return (
    isFootballWeightedMarket(sport, league) ||
    (!isSecondarySportOk(sport) && sport.toLowerCase().includes("football"))
  );
}

function applyFeedSportPolicy(sorted: LiveFeedItemDto[]): LiveFeedItemDto[] {
  if (isFootballFocusProductPhase()) {
    return sorted.filter((it) => it.isFootball).slice(0, 28);
  }
  return applyNonFootballCap(sorted);
}

function applyNonFootballCap(
  sorted: LiveFeedItemDto[],
  maxNonFootballShare = 0.28,
): LiveFeedItemDto[] {
  const maxSecondary = Math.max(1, Math.ceil(sorted.length * maxNonFootballShare));
  let secondaryUsed = 0;
  const out: LiveFeedItemDto[] = [];
  for (const it of sorted) {
    if (!it.isFootball) {
      if (secondaryUsed >= maxSecondary) continue;
      secondaryUsed++;
    }
    out.push(it);
    if (out.length >= 28) break;
  }
  return out;
}

async function analystWinStreak(wallet: string): Promise<number> {
  const rows = await db.order.findMany({
    where: {
      wallet,
      status: "resolved",
      resolvedAt: { gte: msAgo(14 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { resolvedAt: "desc" },
    take: 10,
    select: { pnl: true },
  });
  let streak = 0;
  for (const r of rows) {
    if ((r.pnl ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}

async function analystWeekRoiPct(wallet: string): Promise<number | null> {
  const rows = await db.order.findMany({
    where: {
      wallet,
      status: "resolved",
      resolvedAt: { gte: msAgo(7 * 24 * 60 * 60 * 1000) },
    },
    select: { pnl: true, amount: true },
    take: 80,
  });
  if (rows.length < 3) return null;
  const cost = rows.reduce((s, r) => s + r.amount, 0);
  const pnl = rows.reduce((s, r) => s + (r.pnl ?? 0), 0);
  if (cost <= 0) return null;
  return (pnl / cost) * 100;
}

export const getLiveActivityFeed = baseProcedure
  .input(
    z
      .object({
        limit: z.number().min(8).max(40).optional(),
      })
      .optional(),
  )
  .query(async ({ input }): Promise<LiveActivityFeedOutput> => {
    const now = Date.now();
    if (feedCache && now - feedCache.at < CACHE_MS) {
      return feedCache.payload;
    }

    const limit = input?.limit ?? 28;
    const items: LiveFeedItemDto[] = [];

    try {
      const analysts = await db.analyst.findMany({
        select: { wallet: true, displayName: true },
        take: 40,
      });
      const analystWallets = analysts.map((a) => a.wallet.toLowerCase());

      const analystOrdersPromise =
        analystWallets.length === 0
          ? Promise.resolve(
              [] as Array<{
                id: string;
                wallet: string;
                outcome: string;
                amount: number;
                createdAt: Date;
                market: { event: string; sport: string; league: string };
              }>,
            )
          : db.order.findMany({
              where: {
                status: "open",
                wallet: { in: analystWallets },
              },
              orderBy: { createdAt: "desc" },
              take: 12,
              include: {
                market: {
                  select: { event: true, sport: true, league: true },
                },
              },
            });

      const [
        vault,
        resolvedMarkets,
        closingSoon,
        freshMarkets,
        analystOrders,
        largeOrders,
        openMarketCount,
      ] = await Promise.all([
        db.vaultState.findUnique({
          where: { id: "singleton" },
          select: { totalTvl: true, updatedAt: true },
        }),
        db.market.findMany({
          where: {
            status: "resolved",
            resolvedAt: { gte: msAgo(30 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { resolvedAt: "desc" },
          take: 7,
          select: {
            id: true,
            event: true,
            sport: true,
            league: true,
            winner: true,
            resolvedAt: true,
            volume: true,
          },
        }),
        db.market.findMany({
          where: {
            status: "open",
            closesAt: {
              gt: new Date(),
              lt: new Date(now + 3 * 60 * 60 * 1000),
            },
          },
          orderBy: { closesAt: "asc" },
          take: 8,
          select: { id: true, event: true, sport: true, league: true, closesAt: true },
        }),
        db.market.findMany({
          where: {
            status: "open",
            createdAt: { gte: msAgo(72 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            event: true,
            sport: true,
            league: true,
            volume: true,
            createdAt: true,
          },
        }),
        analystOrdersPromise,
        db.order.findMany({
          where: {
            status: "open",
            amount: { gte: 85 },
            createdAt: { gte: msAgo(36 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          include: {
            market: {
              select: { event: true, sport: true, league: true },
            },
          },
        }),
        db.market.count({ where: { status: "open" } }),
      ]);

      const analystByWallet = new Map(
        analysts.map((a) => [a.wallet.toLowerCase(), a.displayName]),
      );

      if (vault && vault.totalTvl > 0) {
        const isFb = true;
        items.push({
          id: `vault-tvl-${vault.updatedAt.getTime()}`,
          type: "vault_liquidity",
          icon: "🏦",
          text: `Vault liquidity ${fmtUsd(vault.totalTvl)}`,
          color: "text-brand-cyan",
          isFootball: isFb,
          at: vault.updatedAt.getTime(),
        });
      }

      for (const m of resolvedMarkets) {
        const at = m.resolvedAt?.getTime() ?? now;
        const w = (m.winner ?? "").toUpperCase();
        const side =
          w === "YES" || w === "NO"
            ? w
            : m.winner
              ? String(m.winner).slice(0, 24)
              : "settled";
        const fb = marketIsFootball(m.sport, m.league);
        items.push({
          id: `res-${m.id}`,
          type: "market_resolved",
          icon: sportEmojiFromLabel(m.sport),
          text: `Resolved: ${m.event} — ${side} (${fmtUsd(m.volume)} vol)`,
          color: "text-brand-cyan",
          isFootball: fb,
          at,
        });
      }

      for (const m of closingSoon) {
        const mins = Math.max(
          1,
          Math.round((m.closesAt.getTime() - now) / 60_000),
        );
        const fb = marketIsFootball(m.sport, m.league);
        items.push({
          id: `close-${m.id}`,
          type: "market_closing",
          icon: sportEmojiFromLabel(m.sport),
          text: `${m.event} closes in ${fmtMins(mins)}`,
          color: "text-yellow-400",
          isFootball: fb,
          at: m.closesAt.getTime(),
        });
      }

      for (const m of freshMarkets) {
        const fb = marketIsFootball(m.sport, m.league);
        items.push({
          id: `new-${m.id}`,
          type: "new_market",
          icon: sportEmojiFromLabel(m.sport),
          text: `New market: ${m.event} — ${fmtUsd(m.volume)} vol`,
          color: "text-yellow-400",
          isFootball: fb,
          at: m.createdAt.getTime(),
        });
      }

      for (const o of analystOrders) {
        const name =
          analystByWallet.get(o.wallet.toLowerCase()) ??
          `${o.wallet.slice(0, 6)}…${o.wallet.slice(-4)}`;
        const fb = marketIsFootball(o.market.sport, o.market.league);
        items.push({
          id: `ana-open-${o.id}`,
          type: "analyst_position",
          icon: sportEmojiFromLabel(o.market.sport),
          text: `${name} opened ${o.outcome} on ${o.market.event} (${fmtUsd(o.amount)})`,
          color: "text-brand-green",
          isFootball: fb,
          at: o.createdAt.getTime(),
        });
      }

      for (const o of largeOrders) {
        const isAnalyst = analystByWallet.has(o.wallet.toLowerCase());
        if (isAnalyst) continue;
        const fb = marketIsFootball(o.market.sport, o.market.league);
        items.push({
          id: `large-${o.id}`,
          type: "large_prediction",
          icon: sportEmojiFromLabel(o.market.sport),
          text: `${o.wallet.slice(0, 6)}…${o.wallet.slice(-4)} opened ${o.outcome} on ${o.market.event} (${fmtUsd(o.amount)})`,
          color: "text-brand-green",
          isFootball: fb,
          at: o.createdAt.getTime(),
        });
      }

      const recentResolvedTrades = await db.order.findMany({
        where: {
          status: "resolved",
          resolvedAt: { gte: msAgo(10 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { resolvedAt: "desc" },
        take: 12,
        include: {
          market: {
            select: { event: true, sport: true, league: true },
          },
        },
      });
      for (const o of recentResolvedTrades) {
        const fb = marketIsFootball(o.market.sport, o.market.league);
        const wshort = `${o.wallet.slice(0, 6)}…${o.wallet.slice(-4)}`;
        const pnl = o.pnl ?? 0;
        const won = pnl > 0.005;
        items.push({
          id: `trade-res-${o.id}`,
          type: "resolved_trade",
          icon: sportEmojiFromLabel(o.market.sport),
          text: won
            ? `${wshort} won ${o.outcome} on ${o.market.event} (+${fmtUsd(pnl)})`
            : `${wshort} settled ${o.outcome} on ${o.market.event}`,
          color: won ? "text-brand-green" : "text-gray-400",
          isFootball: fb,
          at: (o.resolvedAt ?? o.createdAt).getTime(),
        });
      }

      const copyGrouped = await db.order.groupBy({
        by: ["marketId"],
        where: {
          OR: [
            { id: { startsWith: "copy-" } },
            { id: { startsWith: "seed-copy" } },
          ],
          createdAt: { gte: msAgo(14 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
      });
      copyGrouped.sort((a, b) => b._count.id - a._count.id);
      const topCopy = copyGrouped[0];
      if (topCopy && topCopy._count.id >= 1) {
        const m = await db.market.findUnique({
          where: { id: topCopy.marketId },
          select: { event: true, sport: true, league: true },
        });
        if (m) {
          const fb = marketIsFootball(m.sport, m.league);
          const latestCopyOrder = await db.order.findFirst({
            where: {
              marketId: topCopy.marketId,
              OR: [
                { id: { startsWith: "copy-" } },
                { id: { startsWith: "seed-copy" } },
              ],
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });
          items.push({
            id: `most-copied-${topCopy.marketId}`,
            type: "most_copied",
            icon: sportEmojiFromLabel(m.sport),
            text: `Most copied: ${m.event} (${topCopy._count.id} mirror trades)`,
            color: "text-brand-cyan",
            isFootball: fb,
            at: latestCopyOrder?.createdAt.getTime() ?? now - 120_000,
          });
        }
      }

      const copyLinks24h = await db.copyRelationship.count({
        where: {
          isActive: true,
          startedAt: { gte: msAgo(24 * 60 * 60 * 1000) },
        },
      });
      if (copyLinks24h >= 2) {
        const latestCopyLink = await db.copyRelationship.findFirst({
          where: {
            isActive: true,
            startedAt: { gte: msAgo(24 * 60 * 60 * 1000) },
          },
          orderBy: { startedAt: "desc" },
          select: { startedAt: true },
        });
        items.push({
          id: `copy-spike-${copyLinks24h}`,
          type: "copy_spike",
          icon: "📋",
          text: `Copy trading: ${copyLinks24h} new copier links in 24h`,
          color: "text-brand-green",
          isFootball: true,
          at: latestCopyLink?.startedAt.getTime() ?? now - 60_000,
        });
      }

      const activeCopy = await db.copyRelationship.count({
        where: { isActive: true },
      });
      if (activeCopy >= 4) {
        items.push({
          id: `copy-active-${activeCopy}`,
          type: "copy_active",
          icon: "👥",
          text: `${activeCopy} live copy relationships`,
          color: "text-brand-cyan",
          isFootball: true,
          at: now - 90_000,
        });
      }

      for (const seed of mockAnalysts) {
        const w = seed.wallet.toLowerCase();
        const [streak, roiWeek] = await Promise.all([
          analystWinStreak(w),
          analystWeekRoiPct(w),
        ]);
        if (streak >= 3) {
          items.push({
            id: `streak-${w}-${streak}`,
            type: "analyst_streak",
            icon: "🔥",
            text: `${seed.displayName} — ${streak} resolved wins in a row`,
            color: "text-brand-green",
            isFootball: true,
            at: now - 45_000,
          });
        }
        if (roiWeek != null && roiWeek >= 2 && roiWeek <= 40) {
          items.push({
            id: `week-${w}`,
            type: "analyst_week",
            icon: "📈",
            text: `${seed.displayName} now up +${roiWeek.toFixed(1)}% this week`,
            color: "text-brand-green",
            isFootball: true,
            at: now - 50_000,
          });
        }
      }

      if (openMarketCount > 0) {
        items.push({
          id: `markets-open-${openMarketCount}`,
          type: "platform_open",
          icon: "⚽",
          text: `${openMarketCount} markets open for trading`,
          color: "text-gray-300",
          isFootball: true,
          at: now - 15_000,
        });
      }

      const dedup = new Map<string, LiveFeedItemDto>();
      for (const it of items) {
        if (!dedup.has(it.id)) dedup.set(it.id, it);
      }
      const merged = [...dedup.values()].sort((a, b) => b.at - a.at);
      const capped = applyFeedSportPolicy(merged).slice(0, limit);

      const payload: LiveActivityFeedOutput = {
        items: capped,
        generatedAt: new Date().toISOString(),
      };
      feedCache = { at: now, payload };
      return payload;
    } catch (e) {
      console.warn("[getLiveActivityFeed]", e);
      const empty: LiveActivityFeedOutput = {
        items: [],
        generatedAt: new Date().toISOString(),
      };
      return empty;
    }
  });
