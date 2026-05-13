import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
import {
  hasOpenRouterKey,
  openRouterChatCompletion,
} from "~/server/services/openRouterCompletion";

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
    `Implied odds sit around ${y}% YES vs ${n}% NO for ${input.teamA} vs ${input.teamB} in ${input.league}. ` +
    `Use this as one signal alongside form and news — prices reflect crowd liquidity, not a guarantee.`
  );
}

export const marketAiInsight = baseProcedure
  .input(z.object({ snapshot: snapshotSchema }))
  .query(async ({ input }) => {
    const { snapshot } = input;
    const cfg = AI_MODELS.insights;

    if (!hasOpenRouterKey()) {
      return {
        insight: fallbackInsight(snapshot),
        source: "fallback" as const,
      };
    }

    const userBlock = [
      `Match / market context:`,
      `- Sport: ${snapshot.sport}`,
      `- Competition: ${snapshot.league}`,
      `- Teams: ${snapshot.teamA} (YES side if applicable) vs ${snapshot.teamB}`,
      snapshot.question ? `- Market question: ${snapshot.question}` : null,
      `- Platform YES price (implied prob): ${(snapshot.yesPrice * 100).toFixed(1)}%`,
      `- Platform NO price (implied prob): ${(snapshot.noPrice * 100).toFixed(1)}%`,
      snapshot.volume24h != null
        ? `- 24h volume (USD, indicative): ${Math.round(snapshot.volume24h)}`
        : null,
      snapshot.status ? `- Listing status: ${snapshot.status}` : null,
      snapshot.lifecycle ? `- Lifecycle: ${snapshot.lifecycle}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const system = `You are a senior football (soccer) and sports betting analyst helping users read a prediction market on Predictio.live.
Rules:
- Ground every sentence in the facts provided (teams, league, prices). Do NOT invent injuries, lineups, insider info, or "sharp money" unless explicitly given.
- 2–4 short sentences. Plain English (or Italian if team/league names are Italian — match the user's likely locale from team/league names).
- Explain what the current YES/NO prices imply about crowd belief and uncertainty.
- Mention one or two factors traders typically weigh (form, home field, tournament stakes) only as general sports context, not as facts about this specific match unless supplied.
- End with one transparency line: prices aggregate trader views and fees apply on Predictio — this is not financial advice.
- Never claim you watched the match or have non-public data.`;

    try {
      const out = await openRouterChatCompletion({
        model: cfg.model,
        max_tokens: cfg.max_tokens,
        temperature: cfg.temperature,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `${userBlock}\n\nGive the concise insight now.`,
          },
        ],
      });
      if (!out?.text) {
        return { insight: fallbackInsight(snapshot), source: "fallback" as const };
      }
      return { insight: out.text, source: "openrouter" as const };
    } catch (e) {
      console.error("[marketAiInsight]", e);
      return { insight: fallbackInsight(snapshot), source: "fallback" as const };
    }
  });
