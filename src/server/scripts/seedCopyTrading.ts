/**
 * COPY MARKET SEED — realistic early-stage copy-trading activity.
 * Uses live Market rows from the DB; skips gracefully when no markets exist.
 */
import { db } from "~/server/db";
import {
  mockAnalysts,
  COPY_SEED_MARKET_SORT_SUBSTRINGS,
} from "~/data/mockAffiliates";
import { parseYesNoPrices } from "~/server/utils/prismaMarket";

const ORDER_PREFIX = "seed-copy";

function oppositeOutcome(o: string): "YES" | "NO" {
  return o.toUpperCase() === "YES" ? "NO" : "YES";
}

/** Deterministic pseudo-shuffle so profiles differ but runs are stable */
function shuffleDeterministic<T>(items: T[], salt: string): T[] {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < salt.length; i++) h = (h * 31 + salt.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function buildWinFlags(count: number, wins: number, salt: string): boolean[] {
  const flags = [...Array(wins).fill(true), ...Array(count - wins).fill(false)] as boolean[];
  return shuffleDeterministic(flags, salt);
}

/** Prefer platform “anchor” fixtures so copy-seed orders line up with mock UI + /markets. */
function prioritizeMarketsForCopySeed<T extends { event: string }>(markets: T[]): T[] {
  const subs = COPY_SEED_MARKET_SORT_SUBSTRINGS.map((s) => s.toLowerCase());
  const rank = (ev: string) => {
    const e = ev.toLowerCase();
    const i = subs.findIndex((sub) => e.includes(sub));
    return i === -1 ? 999 : i;
  };
  return [...markets].sort((a, b) => rank(a.event) - rank(b.event));
}

export async function seedCopyTradingExperience(): Promise<void> {
  console.log("[Copy Seed] Starting copy-trading seed...");

  const existingSeedOrders = await db.order.count({
    where: { id: { startsWith: ORDER_PREFIX } },
  });
  if (existingSeedOrders >= 24) {
    console.log("[Copy Seed] Seed orders already present, skipping trade seed");
    return;
  }

  const resolvedMarkets = prioritizeMarketsForCopySeed(
    await db.market.findMany({
      where: { status: "resolved", winner: { not: null } },
      orderBy: { resolvedAt: "desc" },
      take: 80,
    }),
  );

  const openMarkets = prioritizeMarketsForCopySeed(
    await db.market.findMany({
      where: { status: "open" },
      orderBy: { closesAt: "asc" },
      take: 40,
    }),
  );

  if (resolvedMarkets.length < 8 && openMarkets.length < 4) {
    console.log(
      "[Copy Seed] Not enough markets in DB (need some open/resolved). Skipping order seed."
    );
    return;
  }

  const copierWallets = Array.from({ length: 18 }, (_, i) => {
    const hex = `c0ffee${i.toString(16).padStart(34, "0")}`.slice(0, 40);
    return `0x${hex}`.toLowerCase();
  });

  // Ensure copier users exist (modest volume — seed-only social proof)
  for (let i = 0; i < copierWallets.length; i++) {
    const w = copierWallets[i]!;
    await db.user.upsert({
      where: { wallet: w },
      create: {
        wallet: w,
        virtualBalance: 800,
        totalVolume: 110 + (i * 37) % 420,
        firstSeen: new Date(Date.now() - 86400000 * (14 + (i % 24))),
      },
      update: {},
    });
  }

  const profiles: Array<{
    wallet: string;
    resolvedTarget: number;
    winsTarget: number;
    openTarget: number;
    stakeRange: [number, number];
    salt: string;
    followerSlice: [number, number];
  }> = [
    {
      wallet: mockAnalysts[0]!.wallet.toLowerCase(),
      resolvedTarget: 14,
      winsTarget: 9,
      openTarget: 2,
      stakeRange: [18, 48],
      salt: "conservative-v1",
      followerSlice: [0, 6],
    },
    {
      wallet: mockAnalysts[1]!.wallet.toLowerCase(),
      resolvedTarget: 28,
      winsTarget: 16,
      openTarget: 6,
      stakeRange: [22, 118],
      salt: "aggressive-v1",
      followerSlice: [6, 14],
    },
    {
      wallet: mockAnalysts[2]!.wallet.toLowerCase(),
      resolvedTarget: 20,
      winsTarget: 11,
      openTarget: 4,
      stakeRange: [26, 92],
      salt: "value-v1",
      followerSlice: [14, 18],
    },
  ];

  for (const p of profiles) {
    const analyst = await db.analyst.findUnique({ where: { wallet: p.wallet } });
    if (!analyst) {
      console.warn(`[Copy Seed] Analyst not found for ${p.wallet}, skip followers`);
      continue;
    }

    const [fa, fb] = p.followerSlice;
    for (let i = fa; i < fb; i++) {
      const uw = copierWallets[i]!;
      await db.analystFollow.upsert({
        where: {
          userWallet_analystId: { userWallet: uw, analystId: analyst.id },
        },
        create: { userWallet: uw, analystId: analyst.id },
        update: {},
      });
    }
  }

  // Partition markets per profile so trades are not identical
  const resA = resolvedMarkets.filter((_, i) => i % 3 === 0);
  const resB = resolvedMarkets.filter((_, i) => i % 3 === 1);
  const resC = resolvedMarkets.filter((_, i) => i % 3 === 2);
  const openA = openMarkets.filter((_, i) => i % 3 === 0);
  const openB = openMarkets.filter((_, i) => i % 3 === 1);
  const openC = openMarkets.filter((_, i) => i % 3 === 2);

  const pickResolved = [resA, resB, resC];
  const pickOpen = [openA, openB, openC];

  for (let pi = 0; pi < profiles.length; pi++) {
    const p = profiles[pi]!;
    const rMarkets = pickResolved[pi] ?? [];
    const oMarkets = pickOpen[pi] ?? [];
    const winFlags = buildWinFlags(p.resolvedTarget, p.winsTarget, p.salt);

    for (let i = 0; i < p.resolvedTarget; i++) {
      const market = rMarkets[i % Math.max(rMarkets.length, 1)];
      if (!market?.winner) continue;

      const wantWin = winFlags[i] ?? false;
      const w = market.winner.toUpperCase() as "YES" | "NO";
      const outcome: "YES" | "NO" = wantWin ? w : oppositeOutcome(w);
      const { yesPrice, noPrice } = parseYesNoPrices(market.outcomes);
      const avgPrice = outcome === "YES" ? yesPrice : noPrice;
      const spread =
        p.stakeRange[1] - p.stakeRange[0] || 1;
      const amount =
        p.stakeRange[0] +
        ((pi * 17 + i * 13) % spread);
      const shares = amount / avgPrice;
      const costBasis = shares * avgPrice;
      const winner = w;
      const isWinner = outcome === winner;
      const payout = isWinner ? shares * 1.0 : 0;
      const pnl = payout - costBasis;

      const id = `${ORDER_PREFIX}-${pi}-${i}-res`;
      const exists = await db.order.findUnique({ where: { id } });
      if (exists) continue;

      await db.order.create({
        data: {
          id,
          marketId: market.id,
          wallet: p.wallet,
          outcome,
          amount,
          shares,
          avgPrice,
          odds: 1 / avgPrice,
          status: "resolved",
          pnl,
          resolvedAt: market.resolvedAt ?? new Date(Date.now() - 86400000 * (i + 3)),
          orderType: "MARKET",
          heldSince: new Date(Date.now() - 86400000 * (i + 9)),
        },
      });
    }

    for (let j = 0; j < p.openTarget; j++) {
      const market = oMarkets[j % Math.max(oMarkets.length, 1)];
      if (!market) break;
      const { yesPrice, noPrice } = parseYesNoPrices(market.outcomes);
      const outcome: "YES" | "NO" = j % 2 === 0 ? "YES" : "NO";
      const avgPrice = outcome === "YES" ? yesPrice : noPrice;
      const spread =
        p.stakeRange[1] - p.stakeRange[0] || 1;
      const amount =
        p.stakeRange[0] +
        ((pi * 23 + j * 11) % spread);
      const shares = amount / avgPrice;

      const id = `${ORDER_PREFIX}-${pi}-${j}-open`;
      const exists = await db.order.findUnique({ where: { id } });
      if (exists) continue;

      await db.order.create({
        data: {
          id,
          marketId: market.id,
          wallet: p.wallet,
          outcome,
          amount,
          shares,
          avgPrice,
          odds: 1 / avgPrice,
          status: "open",
          orderType: "MARKET",
          heldSince: new Date(Date.now() - 3600000 * (j + 2)),
        },
      });
    }
  }

  for (const a of mockAnalysts) {
    await db.user.upsert({
      where: { wallet: a.wallet.toLowerCase() },
      create: {
        wallet: a.wallet.toLowerCase(),
        virtualBalance: 2400,
        totalVolume: Math.min(a.volumeGenerated * 0.04, 950),
        predictions: a.totalPredictions,
      },
      update: {
        predictions: a.totalPredictions,
      },
    });
  }

  console.log("[Copy Seed] Copy-trading seed complete");
}
