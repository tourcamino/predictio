import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
import { logAiProcedureStart, logAiRuntimeBootstrapOnce } from "~/server/lib/ai/aiRuntime";
import {
  buildCuratedCatalogContextBlock,
  findCatalogRow,
  getCuratedCatalogForAi,
} from "~/server/lib/ai/curatedCatalogContext";
import {
  buildMarketInsightSystemPrompt,
  buildMarketInsightUserMessage,
  insightLensFromContext,
  sanitizeInsightOutput,
  shouldIncludeVolumeInAiPayload,
} from "~/server/lib/ai/prompts";
import {
  getCachedInsight,
  hasOpenRouterKey,
  insightCacheKey,
  logOpenRouterKeyMissingOnce,
  openRouterChatCompletion,
  setCachedInsight,
} from "~/server/lib/ai/openRouterClient";

const snapshotSchema = z.object({
  marketId: z.string().optional(),
  teamA: z.string(),
  teamB: z.string(),
  league: z.string(),
  sport: z.string(),
  question: z.string().optional(),
  yesPrice: z.number(),
  noPrice: z.number(),
  volume24h: z.number().optional(),
  status: z.string().optional(),
  lifecycle: z.enum(["open", "locked", "resolved"]).optional(),
  importanceScore: z.number().optional(),
  curatedRank: z.number().optional(),
});

function fallbackInsight(input: z.infer<typeof snapshotSchema>): string {
  const y = Math.round(input.yesPrice * 100);
  const n = Math.round(input.noPrice * 100);
  return (
    `Pricing implies roughly ${y}% YES versus ${n}% NO for ${input.teamA} vs ${input.teamB} in ${input.league}. ` +
    `This is a vault-backed curated slot on Predictio (pre-testnet paper USDC) — treat prices as crowd-implied probability, not a forecast. ` +
    `Confirm fees and resolution rules in-app before sizing risk; not financial advice.`
  );
}

export const marketAiInsight = baseProcedure
  .input(z.object({ snapshot: snapshotSchema }))
  .query(async ({ input }) => {
    logAiRuntimeBootstrapOnce();
    const { snapshot } = input;
    const cfg = AI_MODELS.insights;

    const catalog = await getCuratedCatalogForAi();
    const catalogRow = findCatalogRow(
      catalog,
      snapshot.marketId,
      snapshot.teamA,
      snapshot.teamB,
    );

    const importanceScore =
      snapshot.importanceScore ?? catalogRow?.importanceScore;
    const curatedRank = snapshot.curatedRank ?? catalogRow?.rank;
    const kickoffIso = catalogRow?.kickoffIso;
    const drawPct = catalogRow?.drawPct;

    const volumeForAi = shouldIncludeVolumeInAiPayload(snapshot.volume24h)
      ? snapshot.volume24h
      : shouldIncludeVolumeInAiPayload(catalogRow?.observedPaperVolumeUsd)
        ? catalogRow!.observedPaperVolumeUsd
        : undefined;

    if (!hasOpenRouterKey()) {
      logOpenRouterKeyMissingOnce();
      logAiProcedureStart("marketAiInsight", {
        modelKey: "insights",
        catalogMarkets: catalog.markets.length,
        usedFallback: true,
        source: "offline",
      });
      return {
        insight: fallbackInsight(snapshot),
        source: "fallback" as const,
      };
    }

    const lens = insightLensFromContext(snapshot.teamA, snapshot.teamB, snapshot.league);
    const catalogBlock = buildCuratedCatalogContextBlock(catalog);
    const system = `${buildMarketInsightSystemPrompt(lens)}\n\n---\n${catalogBlock}`;

    const cachePayload = {
      teamA: snapshot.teamA,
      teamB: snapshot.teamB,
      league: snapshot.league,
      sport: snapshot.sport,
      question: snapshot.question,
      yesPrice: snapshot.yesPrice,
      noPrice: snapshot.noPrice,
      volume24h: volumeForAi,
      status: snapshot.status,
      lifecycle: snapshot.lifecycle,
      lens,
      importanceScore,
      curatedRank,
    };
    const cKey = insightCacheKey(cachePayload);
    const hit = getCachedInsight(cKey);
    if (hit) {
      logAiProcedureStart("marketAiInsight", {
        modelKey: "insights",
        catalogMarkets: catalog.markets.length,
        source: "cache",
      });
      return { insight: hit, source: "openrouter" as const };
    }

    const userContent = buildMarketInsightUserMessage({
      teamA: snapshot.teamA,
      teamB: snapshot.teamB,
      league: snapshot.league,
      sport: snapshot.sport,
      question: snapshot.question,
      yesPct: snapshot.yesPrice * 100,
      noPct: snapshot.noPrice * 100,
      drawPct,
      volume24hUsd: volumeForAi,
      status: snapshot.status,
      lifecycle: snapshot.lifecycle,
      importanceScore,
      curatedRank,
      kickoffIso,
      marketId: snapshot.marketId ?? catalogRow?.marketId,
    });

    logAiProcedureStart("marketAiInsight", {
      modelKey: "insights",
      catalogMarkets: catalog.markets.length,
    });

    const out = await openRouterChatCompletion({
      model: cfg.model,
      max_tokens: Math.min(cfg.max_tokens, 200),
      temperature: cfg.temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    });
    if (!out?.text) {
      logAiProcedureStart("marketAiInsight", {
        modelKey: "insights",
        catalogMarkets: catalog.markets.length,
        usedFallback: true,
        source: "fallback",
      });
      return { insight: fallbackInsight(snapshot), source: "fallback" as const };
    }
    const cleaned = sanitizeInsightOutput(out.text);
    setCachedInsight(cKey, cleaned);
    return { insight: cleaned, source: "openrouter" as const };
  });
