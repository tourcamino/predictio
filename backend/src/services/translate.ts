import translate from "google-translate-api-x";
import { getRedisClient } from "./redis";

function cacheKey(text: string, targetLang: string) {
  return `translate:v1:${targetLang}:${text}`;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return p;
  let t: any;
  const timeout = new Promise<T>((_resolve, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

export async function translateText(params: {
  text: string;
  targetLang: string;
  ttlSeconds: number;
}): Promise<{ translatedText: string; fromCache: boolean }> {
  const { text, targetLang, ttlSeconds } = params;
  const timeoutMs = Number(process.env.TRANSLATE_TIMEOUT_MS || 8000);

  const redis = await getRedisClient().catch(() => null);
  if (redis) {
    const cached = await withTimeout(
      redis.get(cacheKey(text, targetLang)).catch(() => null),
      1000,
      "translate redis get",
    );
    if (cached) return { translatedText: cached, fromCache: true };
  }

  const result = await withTimeout(translate(text, { to: targetLang }), timeoutMs, "translate upstream");
  const translatedText = result.text;

  if (redis) {
    await withTimeout(
      redis
        .set(cacheKey(text, targetLang), translatedText, {
          EX: ttlSeconds,
        })
        .catch(() => null),
      1000,
      "translate redis set",
    );
  }

  return { translatedText, fromCache: false };
}

