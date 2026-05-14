import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
import {
  hasOpenRouterKey,
  logOpenRouterKeyMissingOnce,
  openRouterChatCompletion,
} from "~/server/lib/ai/openRouterClient";

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export const expandMarketSearch = baseProcedure
  .input(
    z.object({
      query: z.string().min(2).max(240),
    }),
  )
  .mutation(async ({ input }) => {
    const raw = normalizeWhitespace(input.query);
    if (!raw.length) {
      return { expandedQuery: "", note: null as string | null };
    }

    if (!hasOpenRouterKey()) {
      logOpenRouterKeyMissingOnce();
      return {
        expandedQuery: raw,
        note: "AI search refinement needs OPENROUTER_KEY or OPENROUTER_API_KEY on the server.",
      };
    }

    const cfg = AI_MODELS.searchExpand;

    const system = `You help users search a sports prediction markets app.
The user may write Italian, English, or informal language (e.g. "juve stasera", "inter milan champions").
Return a SINGLE LINE of search keywords: official team names, league/tournament names, country if relevant.
No sentences. No quotes. Space-separated tokens. Remove filler words ("game", "match", "oggi", "tonight") unless they are part of a proper name.
If the query is already a clean keyword list, lightly normalize spelling (e.g. Juventus not Juve if context needs disambiguation — prefer well-known club names).
Output JSON ONLY on one line: {"q":"your keywords here"}`;

    try {
      const out = await openRouterChatCompletion({
        model: cfg.model,
        max_tokens: cfg.max_tokens,
        temperature: cfg.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `User search: ${raw}` },
        ],
      });

      if (!out?.text) {
        return { expandedQuery: raw, note: null as string | null };
      }

      let parsed: { q?: string } = {};
      try {
        const jsonMatch = out.text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : out.text) as { q?: string };
      } catch {
        return { expandedQuery: raw, note: null as string | null };
      }

      const expanded = normalizeWhitespace(parsed.q ?? "");
      if (!expanded.length) {
        return { expandedQuery: raw, note: null as string | null };
      }

      return { expandedQuery: expanded, note: null as string | null };
    } catch (e) {
      console.error("[expandMarketSearch]", e);
      return { expandedQuery: raw, note: null as string | null };
    }
  });
