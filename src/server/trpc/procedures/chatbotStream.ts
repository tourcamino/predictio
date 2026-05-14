import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
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
    const { message, history = [], walletAddress } = input;

    const messages = [
      { role: "system" as const, content: buildChatAssistantSystemPrompt(walletAddress) },
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
        return {
          response:
            "I'm in offline mode: set OPENROUTER_KEY or OPENROUTER_API_KEY on the server (VITE_OPENROUTER_KEY is read in some dev setups). Until then, browse Markets for events, open any match to trade YES/NO in USDC on Base, and check the Glossary for terms.",
        };
      }

      const out = await openRouterChatCompletion({
        model: cfg.model,
        max_tokens: cfg.max_tokens,
        temperature: cfg.temperature,
        messages,
        timeoutMs: 25_000,
      });

      const aiResponse =
        out?.text ||
        "I couldn't reach the AI service just now — try again in a moment. Meanwhile: Markets lists events; each market trades YES/NO in USDC on Base; use Portfolio for positions; Glossary for terms.";

      return {
        response: aiResponse,
      };
    } catch (error) {
      console.error("[Chatbot] Error:", error);

      return {
        response:
          "I'm having trouble connecting right now. Here are some quick answers:\n\n• To trade: Go to Markets, select an event, choose YES or NO, enter amount, and confirm.\n• Fees: confirm the live split in-app (vault / analysts / referrals).\n• Analyst program: open the Analyst area from the app navigation.\n• More help: Glossary or support@predictio.live",
      };
    }
  });
