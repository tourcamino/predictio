import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
import { expandSearchQuery } from "~/lib/markets/teamPlayerAliases";
import { logAiRuntimeBootstrapOnce } from "~/server/lib/ai/aiRuntime";
import {
  buildCuratedCatalogSearchHints,
  getCuratedCatalogForAi,
} from "~/server/lib/ai/curatedCatalogContext";
import {
  hasOpenRouterKey,
  logOpenRouterKeyMissingOnce,
  openRouterChatCompletion,
} from "~/server/lib/ai/openRouterClient";

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Merge deterministic alias tokens with LLM output. */
function mergeExpandedQuery(deterministic: string[], llmLine: string): string {
  const fromLlm = normalizeWhitespace(llmLine)
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  const merged = [...new Set([...deterministic, ...fromLlm])];
  return merged.join(" ");
}

export const expandMarketSearch = baseProcedure
  .input(
    z.object({
      query: z.string().min(2).max(240),
    }),
  )
  .mutation(async ({ input }) => {
    logAiRuntimeBootstrapOnce();
    const raw = normalizeWhitespace(input.query);
    if (!raw.length) {
      return { expandedQuery: "", note: null as string | null };
    }

    const { expandedTokens } = expandSearchQuery(raw);
    const deterministicExpanded = expandedTokens.join(" ");

    const catalog = await getCuratedCatalogForAi();
    const catalogHints = buildCuratedCatalogSearchHints(catalog);

    console.log(
      JSON.stringify({
        tag: "search_alias_expansion",
        raw: raw.slice(0, 120),
        expanded: expandedTokens.slice(0, 20),
        catalogMarkets: catalog.markets.length,
      }),
    );

    if (!hasOpenRouterKey()) {
      logOpenRouterKeyMissingOnce();
      return {
        expandedQuery: deterministicExpanded || raw,
        note: "AI search refinement needs OPENROUTER_KEY or OPENROUTER_API_KEY on the server. Using alias expansion only.",
      };
    }

    const cfg = AI_MODELS.searchExpand;

    const system = `You help users search a football prediction markets app (Predictio curated catalog).
The user may write Italian, English, nicknames, or player names (e.g. "juve", "lautaro", "bayern", "champions").
Return a SINGLE LINE of search keywords: official team names and league/tournament names that appear in the ACTIVE CURATED MARKETS list below.
Map player nicknames to their club from the list (e.g. lautaro → Inter if Inter is listed).
No sentences. No quotes. Space-separated tokens. Remove filler ("game", "match", "tonight").
Output JSON ONLY on one line: {"q":"your keywords here"}

${catalogHints}`;

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
        return {
          expandedQuery: deterministicExpanded || raw,
          note: null as string | null,
        };
      }

      let parsed: { q?: string } = {};
      try {
        const jsonMatch = out.text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : out.text) as { q?: string };
      } catch {
        return {
          expandedQuery: deterministicExpanded || raw,
          note: null as string | null,
        };
      }

      const llmQ = normalizeWhitespace(parsed.q ?? "");
      const expanded = llmQ.length
        ? mergeExpandedQuery(expandedTokens, llmQ)
        : deterministicExpanded;

      if (!expanded.length) {
        return { expandedQuery: raw, note: null as string | null };
      }

      return { expandedQuery: expanded, note: null as string | null };
    } catch (e) {
      console.error("[expandMarketSearch]", e);
      return {
        expandedQuery: deterministicExpanded || raw,
        note: null as string | null,
      };
    }
  });
