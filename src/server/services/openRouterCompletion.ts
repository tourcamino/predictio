import { env } from "~/server/env";

function resolveOpenRouterKey(): string | undefined {
  const fromEnv = env.OPENROUTER_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const vite = import.meta.env?.VITE_OPENROUTER_KEY as string | undefined;
    return vite?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function hasOpenRouterKey(): boolean {
  return Boolean(resolveOpenRouterKey());
}

export async function openRouterChatCompletion(params: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  max_tokens: number;
  temperature: number;
}): Promise<{ text: string } | null> {
  const apiKey = resolveOpenRouterKey();
  if (!apiKey) return null;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://predictio.live",
      "X-Title": "Predictio",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned empty content");
  return { text };
}
