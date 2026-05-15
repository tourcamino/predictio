import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
import { logAiProcedureStart, logAiRuntimeBootstrapOnce } from "~/server/lib/ai/aiRuntime";
import {
  buildCuratedCatalogContextBlock,
  getCuratedCatalogForAi,
} from "~/server/lib/ai/curatedCatalogContext";
import { buildChatAssistantSystemPrompt } from "~/server/lib/ai/prompts";
import {
  hasOpenRouterKey,
  logOpenRouterKeyMissingOnce,
  openRouterChatCompletion,
} from "~/server/lib/ai/openRouterClient";

export const chatbotStream = baseProcedure
  .input(
    z.object({
      message: z.string().min(1).max(500),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        )
        .optional(),
      walletAddress: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    logAiRuntimeBootstrapOnce();
    const { message, history = [], walletAddress } = input;

    const catalog = await getCuratedCatalogForAi();
    const catalogBlock = buildCuratedCatalogContextBlock(catalog);

    const messages = [
      {
        role: "system" as const,
        content: buildChatAssistantSystemPrompt(walletAddress, catalogBlock),
      },
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const cfg = AI_MODELS.chatbot;

    try {
      if (!hasOpenRouterKey()) {
        logOpenRouterKeyMissingOnce();
        logAiProcedureStart("chatbotStream", {
          modelKey: "chatbot",
          catalogMarkets: catalog.markets.length,
          usedFallback: true,
          source: "offline",
        });
        return {
          response:
            "I'm in offline mode: set OPENROUTER_KEY or OPENROUTER_API_KEY on the server. Until then, browse Markets for the curated catalog (up to 9 football matches), open any event to trade YES/NO in paper USDC (pre-testnet), and check Liquidity for vault exposure.",
        };
      }

      logAiProcedureStart("chatbotStream", {
        modelKey: "chatbot",
        catalogMarkets: catalog.markets.length,
      });

      const out = await openRouterChatCompletion({
        model: cfg.model,
        max_tokens: cfg.max_tokens,
        temperature: cfg.temperature,
        messages,
        timeoutMs: 25_000,
      });

      const aiResponse =
        out?.text ||
        "I couldn't reach the AI service just now — try again in a moment. Browse Markets for the active curated catalog; each event page shows implied YES/NO prices.";

      return {
        response: aiResponse,
      };
    } catch (error) {
      console.error("[Chatbot] Error:", error);
      logAiProcedureStart("chatbotStream", {
        modelKey: "chatbot",
        catalogMarkets: catalog.markets.length,
        usedFallback: true,
        source: "error",
      });

      return {
        response:
          "I'm having trouble connecting right now. Quick answers:\n\n• Curated markets: Markets page lists up to 9 founder-selected football events (editorial order).\n• Vault: Liquidity page explains protocol vault exposure across those slots (pre-testnet paper USDC).\n• Trade: open a match, choose YES or NO, confirm in-app.\n• Help: Glossary or support@predictio.live",
      };
    }
  });
