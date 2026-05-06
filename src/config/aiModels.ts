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
    model: "microsoft/phi-3-mini-128k-instruct",
    max_tokens: 200,
    temperature: 0.5,
    cost_per_1m_input: 0.05,
    label: "Phi-3 Mini"
  },
  analyst: {
    model: "mistralai/mistral-7b-instruct",
    max_tokens: 300,
    temperature: 0.65,
    cost_per_1m_input: 0.07,
    label: "Mistral 7B"
  },
  chatbot: {
    model: "anthropic/claude-3-haiku",
    max_tokens: 500,
    temperature: 0.7,
    cost_per_1m_input: 0.25,
    label: "Claude 3 Haiku"
  }
} as const;

export const estimateCost = (
  model: keyof typeof AI_MODELS,
  inputTokens: number
): number => {
  return (inputTokens / 1000000) * AI_MODELS[model].cost_per_1m_input;
};
