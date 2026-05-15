import type { PrismaClient } from "@prisma/client";
import { fetchAzuroGames, type RawAzuroGame } from "./azuroCuratorGraphql";
import {
  buildEuropeanCurationGamesPayload,
  classifyLeagueTier,
  explainAllowedLeagueRejection,
  explainAppealPoolRejection,
  filterEuropeanUpcoming,
  isItalianPriorityFixture,
  isAllowedLeague,
  computeAppealScore,
  explainAppealScore,
  LOOKAHEAD_SEC_60D,
} from "./eventCurationPipeline";
import {
  getAppealThresholdsByTier,
  type LeagueTier,
} from "./editorialLeagueTiers";
import { collectPaperWalletDiagnostics } from "./paperBalanceBootstrap";
import {
  canonicalLiquidityDebugPayload,
  resolveCanonicalLiquidityState,
} from "./canonicalLiquidityState";

function leagueHistogram(games: RawAzuroGame[], limit = 12): Record<string, number> {
  const map: Record<string, number> = {};
  for (const g of games) {
    const key = `${g.league?.name ?? "?"} | ${g.league?.country?.name ?? "?"}`;
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit),
  );
}

function sampleRows(games: RawAzuroGame[], n = 5) {
  return games.slice(0, n).map((g) => ({
    league: g.league?.name ?? "",
    country: g.league?.country?.name ?? "",
    home: g.participants?.[0]?.name ?? "",
    away: g.participants?.[1]?.name ?? "",
    startsAt: String(g.startsAt ?? ""),
    gameId: String(g.gameId ?? g.id ?? "").trim(),
  }));
}

export type PaginationProbeRow = {
  mode: string;
  raw: number;
  football: number;
  futureWhitelisted: number;
  pagesFetched: number;
  graphqlStartsAtGte: boolean;
};

/** Compare indexer volume: 1 page vs 5 pages, gte vs plain. */
export async function probeAzuroPagination(nowSec: number): Promise<PaginationProbeRow[]> {
  const windowEndSec = nowSec + LOOKAHEAD_SEC_60D;
  const modes: Array<{ label: string; opts: Parameters<typeof fetchAzuroGames>[0] }> = [
    { label: "A_gte_1page", opts: { minStartsAtSec: nowSec, maxPages: 1, pageSize: 250 } },
    { label: "B_gte_5pages", opts: { minStartsAtSec: nowSec, maxPages: 5, pageSize: 250 } },
    {
      label: "C_gte_until_empty",
      opts: { minStartsAtSec: nowSec, maxPages: 40, pageSize: 250 },
    },
    { label: "D_plain_1page", opts: { maxPages: 1, pageSize: 250 } },
    { label: "E_plain_5pages", opts: { maxPages: 5, pageSize: 250 } },
    { label: "F_plain_until_empty", opts: { maxPages: 40, pageSize: 250 } },
  ];

  const rows: PaginationProbeRow[] = [];

  for (const { label, opts } of modes) {
    const raw = await fetchAzuroGames(opts);
    const filtered = filterEuropeanUpcoming(raw, nowSec, windowEndSec);
    rows.push({
      mode: label,
      raw: raw.length,
      football: filtered.validFutureFootball,
      futureWhitelisted: filtered.futureWhitelisted,
      pagesFetched: opts?.maxPages ?? 5,
      graphqlStartsAtGte: Boolean(opts?.minStartsAtSec),
    });
  }

  return rows;
}

export async function collectCatalogDepthDiagnostics(prisma: PrismaClient) {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowEndSec = nowSec + LOOKAHEAD_SEC_60D;

  const openActiveCount = await prisma.curatedEvent.count({
    where: { isActive: true, status: "OPEN" },
  });

  const allGames = await fetchAzuroGames({ minStartsAtSec: nowSec });
  const filterResult = filterEuropeanUpcoming(allGames, nowSec, windowEndSec, {
    openActiveCount,
  });

  const tierAccepted: { A: ReturnType<typeof sampleRows>; B: ReturnType<typeof sampleRows>; C: ReturnType<typeof sampleRows> } = {
    A: [],
    B: [],
    C: [],
  };
  const tierRejectedSample: Array<Record<string, unknown>> = [];

  for (const g of filterResult.upcoming) {
    const league = g.league?.name ?? "";
    const country = g.league?.country?.name ?? "";
    const cls = classifyLeagueTier(league, country, g.league?.slug);
    const row = sampleRows([g], 1)[0];
    if (cls.tier === "A" && tierAccepted.A.length < 5) tierAccepted.A.push(row);
    else if (cls.tier === "B" && tierAccepted.B.length < 5) tierAccepted.B.push(row);
    else if (cls.tier === "C" && tierAccepted.C.length < 5) tierAccepted.C.push(row);
    else if (!cls.tier && tierRejectedSample.length < 8) {
      tierRejectedSample.push({ ...row, reason: cls.rejectionReason });
    }
  }

  const europeanAfterGate = filterResult.europeanGames;
  const appealPassed: RawAzuroGame[] = [];
  const appealRejected: Array<{ game: RawAzuroGame; score: number }> = [];
  const appealPoolTrace: Array<Record<string, unknown>> = [];
  const appealThresholds = getAppealThresholdsByTier();
  const rejectedByAppealThreshold: Record<LeagueTier, number> = { A: 0, B: 0, C: 0 };
  const appealRejectedByTierSamples: Array<{
    league: string;
    tier: LeagueTier;
    appealScore: number;
    requiredThreshold: number;
    reason: string;
  }> = [];
  let editorialClubPrestigeCount = 0;
  let editorialNarrativeCount = 0;
  const appealScoreBoostSamples: Array<{
    fixture: string;
    baseAppeal: number;
    prestigeBoost: number;
    narrativeBoost: number;
    editorialBoostApplied: number;
    finalAppeal: number;
  }> = [];

  for (const g of filterResult.upcoming) {
    if (!isItalianPriorityFixture(g)) continue;
    const gameId = String(g.gameId || "").trim();
    const league = g.league?.name ?? "";
    const country = g.league?.country?.name ?? "";
    const appealScore = computeAppealScore(g);
    if (!isAllowedLeague(league, country, g.league?.slug)) {
      const verdict = explainAllowedLeagueRejection(league, country, g.league?.slug);
      appealPoolTrace.push({
        tag: "appeal_pool_reject",
        gameId,
        league,
        country,
        appealScore,
        isPrestigeFixture: false,
        reason: "league_not_whitelisted",
        rejectionReason: verdict.rejectionReason,
      });
      continue;
    }
    const explained = explainAppealPoolRejection(g, appealScore);
    if (!explained.passes) {
      appealPoolTrace.push({
        tag: "appeal_pool_reject",
        gameId,
        league,
        country,
        appealScore,
        isPrestigeFixture: explained.isPrestigeFixture,
        reason: explained.reason,
        threshold: explained.requiredThreshold,
        tier: explained.tier,
      });
    }
  }

  for (const g of europeanAfterGate) {
    const breakdown = explainAppealScore(g);
    const score = breakdown.finalAppeal;
    if (breakdown.clubPrestigeBoost > 0) editorialClubPrestigeCount += 1;
    if (breakdown.narrativeFixtureBoost > 0) editorialNarrativeCount += 1;
    if (
      breakdown.editorialBoostApplied > 0 &&
      appealScoreBoostSamples.length < 10
    ) {
      const sorted = [...(g.participants ?? [])].sort(
        (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
      );
      const home = sorted[0]?.name ?? "Home";
      const away = sorted[1]?.name ?? "Away";
      appealScoreBoostSamples.push({
        fixture: `${home} vs ${away}`,
        baseAppeal: breakdown.baseAppeal,
        prestigeBoost: breakdown.clubPrestigeBoost,
        narrativeBoost: breakdown.narrativeFixtureBoost,
        editorialBoostApplied: breakdown.editorialBoostApplied,
        finalAppeal: breakdown.finalAppeal,
      });
    }
    const explained = explainAppealPoolRejection(g, score);
    if (explained.passes) {
      appealPassed.push(g);
    } else {
      appealRejected.push({ game: g, score });
      if (explained.tier && explained.reason === "appeal_below_threshold") {
        rejectedByAppealThreshold[explained.tier] += 1;
        if (appealRejectedByTierSamples.length < 12) {
          appealRejectedByTierSamples.push({
            league: g.league?.name ?? "",
            tier: explained.tier,
            appealScore: score,
            requiredThreshold: explained.requiredThreshold,
            reason: explained.reason,
          });
        }
      }
    }
  }

  const italianInUpcoming = filterResult.upcoming.filter((g) => isItalianPriorityFixture(g));
  const italianInAppealPool = appealPassed.filter((g) => isItalianPriorityFixture(g));

  const { games: picked, diagnostics } = await buildEuropeanCurationGamesPayload(new Set(), {
    openActiveCount,
  });

  const openActive = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    orderBy: { importanceScore: "desc" },
    select: {
      title: true,
      leagueName: true,
      country: true,
      importanceScore: true,
      selectedBy: true,
      gameId: true,
    },
  });

  const selectedByTier: Record<LeagueTier, number> = { A: 0, B: 0, C: 0 };
  for (const g of picked) {
    const cls = classifyLeagueTier(g.leagueName, g.country);
    if (cls.tier) selectedByTier[cls.tier] += 1;
  }

  const sampleWhitelisted = sampleRows(europeanAfterGate, 8);
  const sampleRejected = appealRejected.slice(0, 8).map(({ game, score }) => {
    const leagueName = game.league?.name ?? "";
    const country = game.league?.country?.name ?? "";
    const explained = explainAppealPoolRejection(game, score);
    return {
      league: leagueName,
      country,
      tier: explained.tier,
      appealScore: score,
      requiredThreshold: explained.requiredThreshold,
      isPrestigeFixture: explained.isPrestigeFixture,
      reason: explained.reason,
    };
  });

  const layers = [
    { layer: "1_fetchAzuroGames", count: allGames.length, sampleLeagues: leagueHistogram(allGames) },
    {
      layer: "2_afterStaleFilter_football",
      count: filterResult.footballGames.length,
      sampleLeagues: leagueHistogram(filterResult.footballGames),
    },
    {
      layer: "3_futureFootball_60d",
      count: filterResult.validFutureFootball,
      sampleLeagues: leagueHistogram(filterResult.upcoming),
    },
    {
      layer: "4_whitelistGate",
      count: filterResult.futureWhitelisted,
      sampleLeagues: leagueHistogram(europeanAfterGate),
    },
    {
      layer: "5_appealPool",
      count: appealPassed.length,
      sampleLeagues: leagueHistogram(appealPassed),
      note: `rejectedByAppeal=${appealRejected.length} thresholds=A${appealThresholds.A}/B${appealThresholds.B}/C${appealThresholds.C}`,
    },
    {
      layer: "6_italianQuota_inputs",
      count: filterResult.futureItalianPool,
      italianInAppealPool: italianInAppealPool.length,
      italianInUpcomingOnly: italianInUpcoming.length,
    },
    {
      layer: "7_combinedPool_pipeline",
      count: diagnostics.combinedPoolSize,
    },
    { layer: "8_picked_final", count: diagnostics.pickedCount },
    { layer: "9_db_open_active", count: openActive.length },
  ];

  console.log(
    JSON.stringify({
      tag: "catalog_depth_trace",
      layers,
      appealGap: {
        europeanAfterGate: europeanAfterGate.length,
        appealPassed: appealPassed.length,
        futureItalianInUpcoming: italianInUpcoming.length,
        futureItalianInAppealPool: italianInAppealPool.length,
        whyItalianPool2ButCombined1:
          "futureItalianPool counts upcoming Italy-priority fixtures; combinedPool uses tier appeal thresholds (A110/B80/C60) or prestige/UCL",
      },
    }),
  );

  const paginationProbe = await probeAzuroPagination(nowSec);

  const appealSum = openActive.reduce((s, r) => s + r.importanceScore, 0);
  const canonicalLiquidity = await resolveCanonicalLiquidityState(prisma);
  const vaultExposure = {
    ...canonicalLiquidityDebugPayload(canonicalLiquidity),
    dbOpenActiveCount: openActive.length,
    appealScoreSum: appealSum,
    vaultAlignment: canonicalLiquidity.vaultAlignment,
  };
  const paperWalletStats = await collectPaperWalletDiagnostics(prisma);

  return {
    tag: "catalog_debug",
    at: new Date().toISOString(),
    rawIndexer: allGames.length,
    stalePrematchRejected: filterResult.stalePrematchRejected,
    futureFootball: filterResult.validFutureFootball,
    futureWhitelisted: filterResult.futureWhitelisted,
    futureItalianPool: filterResult.futureItalianPool,
    tierA: filterResult.tierA,
    tierB: filterResult.tierB,
    tierC: filterResult.tierC,
    tierCActivated: filterResult.tierCActivated,
    rejectedByTier: filterResult.rejectedByTier,
    tierAccepted,
    tierRejectedSample,
    appealThresholds,
    selectedByTier,
    rejectedByAppealThreshold,
    appealRejectedByTierSamples,
    editorialBoostsApplied: {
      clubPrestige: editorialClubPrestigeCount,
      narrativeFixture: editorialNarrativeCount,
    },
    appealScoreBoostSamples,
    appealPool: appealPassed.length,
    combinedPool: diagnostics.combinedPoolSize,
    picked: diagnostics.pickedCount,
    openActive: openActive.length,
    layers,
    paginationProbe,
    sampleWhitelisted,
    sampleRejected,
    appealPoolTrace,
    sampleAppealRejectedLowScore: appealRejected.slice(0, 5).map(({ game, score }) => ({
      league: game.league?.name,
      country: game.league?.country?.name,
      appealScore: score,
    })),
    dbOpenActive: openActive,
    pipelinePickedTitles: picked.map((g) => ({
      title: g.title,
      league: g.leagueName,
      score: g.importanceScore,
      editorialSlot: g.editorialSlot ?? null,
      selectionReason: g.selectionReason ?? null,
    })),
    editorialSlots: diagnostics.editorialSlots ?? null,
    editorialSlotSamples: diagnostics.editorialSlotSamples ?? null,
    editorialRedistributions: diagnostics.editorialRedistributions ?? [],
    multisportPremiumPool: diagnostics.multisportPremiumPool ?? 0,
    multisportBySport: diagnostics.multisportBySport ?? null,
    vaultExposure,
    paperWalletStats,
  };
}
