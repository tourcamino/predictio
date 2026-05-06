import { AI_MODELS, estimateCost } from "~/config/aiModels";

interface OpenRouterResponse {
  text: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  estimatedCost: number;
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

class OpenRouterClient {
  private apiKey: string;
  public usageLog: Array<{
    task: string;
    model: string;
    tokens: number;
    cost: number;
    timestamp: number;
  }> = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(
    task: string,
    modelKey: keyof typeof AI_MODELS,
    systemPrompt: string,
    userPrompt: string
  ): Promise<OpenRouterResponse> {
    const config = AI_MODELS[modelKey];

    try {
      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://predictio.live",
          "X-Title": `Predictio — ${task}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.max_tokens,
          temperature: config.temperature,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const text = data.choices[0].message.content.trim();
      const usage = data.usage;
      const cost = estimateCost(modelKey, usage.prompt_tokens);

      this.usageLog.push({
        task,
        model: config.model,
        tokens: usage.total_tokens,
        cost,
        timestamp: Date.now(),
      });

      return { text, model: config.model, usage, estimatedCost: cost };
    } catch (error) {
      // Fallback mock if OpenRouter not available
      console.warn("[OpenRouter] Fallback to mock:", error);
      return {
        text: getMockResponse(task, userPrompt),
        model: "mock",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        estimatedCost: 0,
      };
    }
  }

  getTotalCost(): number {
    return this.usageLog.reduce((sum, log) => sum + log.cost, 0);
  }

  getMonthlyProjection(): number {
    if (this.usageLog.length === 0) return 0;
    const sessionMinutes = 60; // mock
    const costPerMinute = this.getTotalCost() / sessionMinutes;
    return costPerMinute * 60 * 8 * 22;
  }
}

function getMockResponse(task: string, prompt: string): string {
  const mocks: Record<string, string> = {
    "Affiliate Outreach":
      "Hey — your audience is already predicting these matches. We pay analysts 25% of all fees their followers generate, in USDC. Worth 5 min?",
    "Market Content": JSON.stringify({
      preMatch:
        "$124K already on El Clasico and the market is split 45-33. Someone knows something about tonight's lineup.",
      lastHour:
        "Bernabéu in 58 minutes. Sharp money just moved to Draw in the last hour. $124K total.",
      controversial:
        "Everyone's backing Real Madrid at home but $27K is sitting on Draw. Casemiro is suspended. Do the math.",
    }),
    "Tweet Reply":
      "Market has them at 45% right now. $124K disagrees with you.",
    "Market Insight":
      "Sharp money moved to Draw in the last 2h. Volume pattern suggests informed traders know something about lineup.",
    "Network Proposal":
      "Hi, I'm reaching out from Predictio.live regarding a potential partnership with your network...",
    "Re-engagement":
      "Hey — you have $1,240 in pending rewards sitting unclaimed. Also 3 new followers this week while you were away.",
    "User DM":
      "Noticed you're into UFC — curious what you think about the Poirier line. Market's at 38% right now.",
  };
  return (
    mocks[task] ||
    "AI response unavailable — please check OpenRouter connection."
  );
}

export const aiClient = new OpenRouterClient(
  import.meta.env.VITE_OPENROUTER_KEY || ""
);
