import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

const SYSTEM_PROMPT = `You are an AI assistant for Predictio.live, a decentralized prediction market platform built on Base blockchain.

Your role is to help users understand and navigate the platform. Here's key information:

PLATFORM OVERVIEW:
- Predictio is a prediction market where users trade on real-world event outcomes
- Built on Base (Ethereum L2), uses USDC for trading
- Currently focused on football (soccer) markets, especially Serie A and Champions League

HOW IT WORKS:
- Users buy YES or NO shares on event outcomes (e.g., "Will Real Madrid win?")
- Share prices represent probability (0.65 = 65% chance)
- Winners get 1 USDC per share, losers get 0
- Markets lock when events start, resolve after events end

TRADING:
- 1% taker fee on trades (0% maker fee for limit orders)
- Minimum trade: $1 USDC
- Can place market orders (instant) or limit orders
- Can sell positions anytime before market locks

FEE STRUCTURE:
- 50% of fees go to Protocol Vault (provides liquidity)
- 35% go to Analyst (if user was referred)
- 15% go to Referral source
- Special cases: if analyst = referral, they get 50% combined

ANALYST PROGRAM:
- Users can become analysts and earn 35% commission on follower trades
- Get unique referral code to share
- Earn additional 15% on direct referrals
- Must reach €10 threshold to request payout

PROTOCOL VAULT:
- Single shared liquidity pool
- Deposit USDC to earn fees from all trades
- Auto-compound option available
- 30% max allocation per market (risk management)
- Can withdraw anytime (subject to liquidity)

COPY TRADING:
- Follow successful analysts
- Automatically copy their trades
- Set max allocation per trade
- Can stop anytime

MARKET LIFECYCLE:
1. OPEN: Trading active until event starts
2. LOCKED: Event in progress, no trading
3. RESOLVED: Outcome determined, winners can claim

WALLET & SECURITY:
- Wallet-based authentication (no email/password)
- Supports MetaMask, WalletConnect, Coinbase Wallet
- All transactions on Base blockchain
- EIP-712 signatures for authentication

Be helpful, friendly, and concise. If you don't know something specific, admit it and suggest contacting support. Always encourage responsible trading.`;

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
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    try {
      // Use OpenRouter API to generate response
      const openrouterKey = env.OPENROUTER_KEY || import.meta.env.VITE_OPENROUTER_KEY;
      
      if (!openrouterKey) {
        // Fallback response if API key not configured
        return {
          response: "I'm currently in demo mode. The AI assistant requires an OpenRouter API key to function. Please contact support for assistance, or check out our Help section for common questions.",
        };
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://predictio.live',
          'X-Title': 'Predictio AI Assistant',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku', // Fast and cost-effective
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

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
