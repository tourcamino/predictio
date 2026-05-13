import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { AI_MODELS } from "~/config/aiModels";
import {
  hasOpenRouterKey,
  openRouterChatCompletion,
} from "~/server/services/openRouterCompletion";

const SYSTEM_PROMPT = `You are the sports & prediction-markets guide for Predictio.live — a decentralized prediction market on Base (USDC).

Expertise: football/soccer first (Serie A, Champions League, domestic cups, international windows), plus general sports prediction-market literacy (how odds/implied probability work, liquidity, why prices move).

Your job:
- Explain the product clearly: YES/NO shares, implied probability, when markets lock and resolve (oracle-driven).
- Give practical navigation help (markets list, portfolio, analyst program, vault).
- When users ask for picks or "who wins", give balanced sports reasoning (form, tactics context, injuries ONLY as general categories — never invent specific lineup news). Always say crowd prices are not guarantees.
- Transparency every time you touch trading: mention Predictio charges trading fees and splits revenue between protocol vault / analysts / referrals per site rules; users should verify fees on-platform. This is educational, not financial advice.

Platform facts (keep accurate):
- Trading on Base with USDC.
- Taker fee on trades (maker discounts where applicable); fee split includes Protocol Vault, Analyst share when referred, Referral share — exact percentages are shown on the site (cite that user should confirm in-app).
- Wallet login (MetaMask, WalletConnect, Coinbase Wallet, etc.), non-custodial flow.

Tone: concise (short paragraphs), friendly, expert but humble. If unsure about a policy detail, say to check the in-app disclosure or support — don't invent numbers.

Responsible trading: encourage bankroll awareness and never chasing losses.

Session metadata rules:
- You may receive a line like "Wallet session: connected (public ref 0xabcd…9f01)" — use it only to tailor navigation (Portfolio, Wallet, deposits). Never repeat the full address unless the user pasted it themselves.
- Never ask for seed phrases, private keys, screenshots of wallets, or signatures on unknown messages.
- Never invent balances, open positions, or PnL — send users to Portfolio / on-chain views for account-specific data.`;

/** Strict EVM hex check; only then expose truncated ref to the model. */
function walletRefForPrompt(addr: string | undefined): string | null {
  if (!addr?.trim()) return null;
  const s = addr.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(s)) return null;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function buildSystemPrompt(walletAddress: string | undefined): string {
  const ref = walletRefForPrompt(walletAddress);
  const session =
    ref !== null
      ? `Wallet session: connected (public ref ${ref} only). User may trade USDC on Base, deposit, withdraw, and view Portfolio. Never claim you know their balance or positions. Point them to Portfolio and Wallet pages for account specifics.`
      : `Wallet session: not connected (guest). Explain connect-wallet flows for trading or deposits when relevant; never imply they already have funds on Predictio.`;

  return `${SYSTEM_PROMPT}\n\n---\n${session}`;
}

export const chatbotStream = baseProcedure
  .input(
    z.object({
      message: z.string().min(1).max(500),
      history: z.array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      ).optional(),
      walletAddress: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { message, history = [], walletAddress } = input;

    // Build conversation history for context
    const messages = [
      { role: 'system' as const, content: buildSystemPrompt(walletAddress) },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const cfg = AI_MODELS.chatbot;

    try {
      if (!hasOpenRouterKey()) {
        return {
          response:
            "I'm in offline mode: add OPENROUTER_KEY (server) or VITE_OPENROUTER_KEY so OpenRouter can answer. Until then, browse Markets for events, open any match to trade YES/NO in USDC on Base, and check the Glossary for terms.",
        };
      }

      const out = await openRouterChatCompletion({
        model: cfg.model,
        max_tokens: cfg.max_tokens,
        temperature: cfg.temperature,
        messages,
      });

      const aiResponse =
        out?.text ||
        "I'm sorry, I couldn't generate a response. Please try again.";

      return {
        response: aiResponse,
      };
    } catch (error) {
      console.error('[Chatbot] Error:', error);
      
      // Return helpful fallback
      return {
        response: "I'm having trouble connecting right now. Here are some quick answers:\n\n• To trade: Go to Markets, select an event, choose YES or NO, enter amount, and confirm.\n• Fees: 1% on trades, split 50/35/15 between vault/analyst/referral.\n• To become analyst: Visit Analyst Dashboard and register.\n• For more help: Check our Glossary or contact support@predictio.live",
      };
    }
  });
