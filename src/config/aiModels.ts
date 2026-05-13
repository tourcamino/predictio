/** Default routing: economical OpenRouter models with strong prompting for sport/markets. */
export const AI_MODELS = {
  outreach: {
    model: "mistralai/mistral-7b-instruct",
    max_tokens: 600,
    temperature: 0.7,
    cost_per_1m_input: 0.07,
    label: "Mistral 7B"
  },
  content: {
    model: "meta-llama/llama-3-8b-instruct",
    max_tokens: 400,
    temperature: 0.8,
    cost_per_1m_input: 0.05,
    label: "Llama 3 8B"
  },
  replies: {
    model: "google/gemma-7b-it",
    max_tokens: 150,
    temperature: 0.75,
    cost_per_1m_input: 0.07,
    label: "Gemma 7B"
  },
  dms: {
    model: "meta-llama/llama-3-8b-instruct",
    max_tokens: 200,
    temperature: 0.72,
    cost_per_1m_input: 0.05,
    label: "Llama 3 8B"
  },
  insights: {
    model: "meta-llama/llama-3.1-8b-instruct",
    max_tokens: 220,
    temperature: 0.35,
    cost_per_1m_input: 0.02,
    label: "Llama 3.1 8B"
  },
  analyst: {
    model: "mistralai/mistral-7b-instruct",
    max_tokens: 300,
    temperature: 0.65,
    cost_per_1m_input: 0.07,
    label: "Mistral 7B"
  },
  chatbot: {
    model: "meta-llama/llama-3.1-8b-instruct",
    max_tokens: 520,
    temperature: 0.55,
    cost_per_1m_input: 0.02,
    label: "Llama 3.1 8B"
  },
  /** Short JSON / keyword extraction for search intent */
  searchExpand: {
    model: "meta-llama/llama-3.2-3b-instruct",
    max_tokens: 120,
    temperature: 0.15,
    cost_per_1m_input: 0.015,
    label: "Llama 3.2 3B"
  },
} as const;

export const estimateCost = (
  model: keyof typeof AI_MODELS,
  inputTokens: number
): number => {
  return (inputTokens / 1000000) * AI_MODELS[model].cost_per_1m_input;
};

export type AiModelKey = keyof typeof AI_MODELS;
