/**
 * Single server-side OpenRouter client — timeouts, light retry, safe JSON, structured logs.
 * Do not log API keys or full user prompts in production logs.
 */
import { createHash } from "node:crypto";
import { env } from "~/server/env";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 22_000;
const RETRYABLE = new Set([429, 502, 503, 504]);

/** When primary model returns 400/404 (unknown id), try once. */
const NETWORK_FALLBACK_MODEL = "meta-llama/llama-3.2-3b-instruct";

function resolveOpenRouterKey(): string | undefined {
  const a =
    env.OPENROUTER_KEY?.trim() || env.OPENROUTER_API_KEY?.trim();
  if (a) return a;
  const b = env.VITE_OPENROUTER_KEY?.trim();
  if (b) return b;
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.OPENROUTER_KEY?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.VITE_OPENROUTER_KEY?.trim() ||
      undefined
    );
  }
  return undefined;
}

export function hasOpenRouterKey(): boolean {
  return Boolean(resolveOpenRouterKey());
}

let loggedMissingKey = false;
/** Call from AI procedures when falling back so ops see one clear warning per process. */
export function logOpenRouterKeyMissingOnce(): void {
  if (loggedMissingKey || hasOpenRouterKey()) return;
  loggedMissingKey = true;
  logOpenRouter("warn", "openrouter_unconfigured", {
    hint: "set OPENROUTER_KEY or OPENROUTER_API_KEY (optional VITE_OPENROUTER_KEY in dev)",
  });
}

function logOpenRouter(
  level: "info" | "warn" | "error",
  msg: string,
  meta?: Record<string, string | number | undefined>,
): void {
  const line = JSON.stringify({
    tag: "openrouter",
    level,
    msg,
    ...meta,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

async function parseJsonBody(res: Response): Promise<unknown> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`OpenRouter invalid JSON (HTTP ${res.status}, len=${raw.length})`);
  }
}

function extractMessageText(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as {
    choices?: Array<{ message?: { content?: string | null } }>;
    error?: { message?: string };
  };
  if (d.error?.message) {
    throw new Error(`OpenRouter API error: ${d.error.message.slice(0, 200)}`);
  }
  const text = d.choices?.[0]?.message?.content?.trim();
  return text || undefined;
}

async function fetchCompletionOnce(params: {
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  max_tokens: number;
  temperature: number;
  signal: AbortSignal;
}): Promise<Response> {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.FRONTEND_URL?.trim() || "https://predictio.live",
      "X-Title": "Predictio",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
    }),
  });
}

/**
 * Non-streaming chat completion. Returns null if no API key or empty model output (caller uses fallback).
 */
export async function openRouterChatCompletion(params: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  max_tokens: number;
  temperature: number;
  /** Optional override for serverless tight budgets */
  timeoutMs?: number;
}): Promise<{ text: string } | null> {
  const apiKey = resolveOpenRouterKey();
  if (!apiKey) {
    logOpenRouter("warn", "missing_api_key");
    return null;
  }

  logOpenRouter("info", "request_started", { model: params.model });

  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const fetchOnce = async (model: string): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchCompletionOnce({
        apiKey,
        model,
        messages: params.messages,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const runModel = async (model: string): Promise<{ text: string }> => {
    let res = await fetchOnce(model);

    if (RETRYABLE.has(res.status)) {
      logOpenRouter("warn", "retry_http", { status: res.status, model });
      await new Promise((r) => setTimeout(r, 700));
      res = await fetchOnce(model);
    }

    if (!res.ok) {
      const errSnippet = (await res.text().catch(() => "")).slice(0, 220);
      logOpenRouter("error", "http_error", {
        status: res.status,
        model,
        len: errSnippet.length,
      });
      if ((res.status === 400 || res.status === 404) && model !== NETWORK_FALLBACK_MODEL) {
        logOpenRouter("warn", "fallback_model", { from: model, to: NETWORK_FALLBACK_MODEL });
        return runModel(NETWORK_FALLBACK_MODEL);
      }
      throw new Error(`OpenRouter HTTP ${res.status}: ${errSnippet}`);
    }

    const data = await parseJsonBody(res);
    const text = extractMessageText(data);
    if (!text) {
      logOpenRouter("warn", "empty_choices", { model });
      throw new Error("OpenRouter returned empty content");
    }
    logOpenRouter("info", "ok", { model, chars: text.length });
    return { text };
  };

  try {
    return await runModel(params.model);
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const aborted = name === "AbortError";
    logOpenRouter(aborted ? "warn" : "error", aborted ? "timeout" : "request_failed", {
      model: params.model,
      err: (e as Error)?.message?.slice(0, 120),
    });
    return null;
  }
}

/** Short-lived cache for identical insight payloads (reduces duplicate spend on refetch). */
const insightCache = new Map<string, { exp: number; text: string }>();
const INSIGHT_CACHE_TTL_MS = 3 * 60 * 1000;

export function getCachedInsight(cacheKey: string): string | null {
  const row = insightCache.get(cacheKey);
  if (!row) return null;
  if (Date.now() > row.exp) {
    insightCache.delete(cacheKey);
    return null;
  }
  return row.text;
}

export function setCachedInsight(cacheKey: string, text: string): void {
  insightCache.set(cacheKey, { exp: Date.now() + INSIGHT_CACHE_TTL_MS, text });
  if (insightCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of insightCache) {
      if (v.exp < now) insightCache.delete(k);
    }
  }
}

export function insightCacheKey(snapshot: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 40);
}
