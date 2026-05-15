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
  buildAskMarketAiFallback,
  buildAskMarketAiFocusBlock,
  buildAskMarketAiSystemPrompt,
  buildAskMarketAiUserMessage,
  sanitizeAskMarketAiOutput,
} from "~/server/lib/ai/prompts";
import {
  hasOpenRouterKey,
  logOpenRouterKeyMissingOnce,
  openRouterChatCompletion,
} from "~/server/lib/ai/openRouterClient";

const inputSchema = z.object({
  marketId: z.string().min(1),
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  league: z.string().min(1),
  sport: z.string().default("football"),
  question: z.string().min(1).max(500),
  yesPrice: z.number().min(0).max(1),
  noPrice: z.number().min(0).max(1),
  kickoffIso: z.string().optional(),
  lifecycle: z.enum(["open", "locked", "resolved"]).optional(),
  status: z.string().optional(),
});

export const askMarketAi = baseProcedure.input(inputSchema).mutation(async ({ input }) => {
  logAiRuntimeBootstrapOnce();

  const catalog = await getCuratedCatalogForAi();
  const catalogRow = findCatalogRow(catalog, input.marketId, input.teamA, input.teamB);

  const yesPct = input.yesPrice * 100;
  const noPct = input.noPrice * 100;
  const drawPct = catalogRow?.drawPct;

  const ctx = {
    marketId: input.marketId,
    teamA: input.teamA,
    teamB: input.teamB,
    league: input.league,
    sport: input.sport,
    question: input.question,
    yesPct,
    noPct,
    drawPct,
    importanceScore: catalogRow?.importanceScore,
    curatedRank: catalogRow?.rank,
    kickoffIso: catalogRow?.kickoffIso ?? input.kickoffIso,
    lifecycle: input.lifecycle,
    vaultNarrative: catalog.vaultNarrative,
  };

  const focusBlock = buildAskMarketAiFocusBlock(catalogRow ?? null, {
    teamA: input.teamA,
    teamB: input.teamB,
    league: input.league,
    yesPct,
    noPct,
    marketId: input.marketId,
  });
  const catalogBlock = buildCuratedCatalogContextBlock(catalog);

  if (!hasOpenRouterKey()) {
    logOpenRouterKeyMissingOnce();
    logAiProcedureStart("askMarketAi", {
      modelKey: "chatbot",
      catalogMarkets: catalog.markets.length,
      usedFallback: true,
      source: "offline",
    });
    console.log(
      JSON.stringify({
        tag: "ai_market_question",
        marketId: input.marketId,
        offline: true,
        questionLen: input.question.length,
      }),
    );
    return {
      response: buildAskMarketAiFallback(ctx),
      source: "fallback" as const,
    };
  }

  const system = buildAskMarketAiSystemPrompt(catalogBlock, focusBlock);
  const userContent = buildAskMarketAiUserMessage(ctx);
  const cfg = AI_MODELS.chatbot;

  logAiProcedureStart("askMarketAi", {
    modelKey: "chatbot",
    catalogMarkets: catalog.markets.length,
  });
  console.log(
    JSON.stringify({
      tag: "ai_market_question",
      marketId: input.marketId,
      rank: catalogRow?.rank,
      appeal: catalogRow?.importanceScore,
      questionLen: input.question.length,
    }),
  );

  const out = await openRouterChatCompletion({
    model: cfg.model,
    max_tokens: Math.min(cfg.max_tokens, 400),
    temperature: 0.45,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    timeoutMs: 25_000,
  });

  if (!out?.text) {
    logAiProcedureStart("askMarketAi", {
      modelKey: "chatbot",
      catalogMarkets: catalog.markets.length,
      usedFallback: true,
      source: "fallback",
    });
    return {
      response: buildAskMarketAiFallback(ctx),
      source: "fallback" as const,
    };
  }

  return {
    response: sanitizeAskMarketAiOutput(out.text),
    source: "openrouter" as const,
  };
});
