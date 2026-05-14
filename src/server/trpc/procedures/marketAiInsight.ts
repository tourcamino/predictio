import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
import {
  buildMarketInsightSystemPrompt,
  buildMarketInsightUserMessage,
  insightLensFromContext,
  sanitizeInsightOutput,
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
});

function fallbackInsight(input: z.infer<typeof snapshotSchema>): string {
  const y = Math.round(input.yesPrice * 100);
  const n = Math.round(input.noPrice * 100);
  return (
    `Pricing implies roughly ${y}% YES versus ${n}% NO for ${input.teamA} vs ${input.teamB} in ${input.league}. ` +
    `Treat that as crowd-implied probability, not a forecast — confirm fees and resolution rules on Predictio before sizing risk.`
  );
}

export const marketAiInsight = baseProcedure
  .input(z.object({ snapshot: snapshotSchema }))
  .query(async ({ input }) => {
    const { snapshot } = input;
    const cfg = AI_MODELS.insights;

    if (!hasOpenRouterKey()) {
      logOpenRouterKeyMissingOnce();
      return {
        insight: fallbackInsight(snapshot),
        source: "fallback" as const,
      };
    }

    const lens = insightLensFromContext(snapshot.teamA, snapshot.teamB, snapshot.league);
    const system = buildMarketInsightSystemPrompt(lens);

    const cachePayload = {
      teamA: snapshot.teamA,
      teamB: snapshot.teamB,
      league: snapshot.league,
      sport: snapshot.sport,
      question: snapshot.question,
      yesPrice: snapshot.yesPrice,
      noPrice: snapshot.noPrice,
      volume24h: snapshot.volume24h,
      status: snapshot.status,
      lifecycle: snapshot.lifecycle,
      lens,
    };
    const cKey = insightCacheKey(cachePayload);
    const hit = getCachedInsight(cKey);
    if (hit) {
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
      volume24hUsd: snapshot.volume24h,
      status: snapshot.status,
      lifecycle: snapshot.lifecycle,
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
      return { insight: fallbackInsight(snapshot), source: "fallback" as const };
    }
    const cleaned = sanitizeInsightOutput(out.text);
    setCachedInsight(cKey, cleaned);
    return { insight: cleaned, source: "openrouter" as const };
  });
