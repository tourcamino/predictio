import translate from "google-translate-api-x";
import { getRedisClient } from "./redis";

function cacheKey(text: string, targetLang: string) {
  return `translate:v1:${targetLang}:${text}`;
}

export async function translateText(params: {
  text: string;
  targetLang: string;
  ttlSeconds: number;
}): Promise<{ translatedText: string; fromCache: boolean }> {
  const { text, targetLang, ttlSeconds } = params;

  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(cacheKey(text, targetLang));
    if (cached) return { translatedText: cached, fromCache: true };
  }

  const result = await translate(text, { to: targetLang });
  const translatedText = result.text;

  if (redis) {
    await redis.set(cacheKey(text, targetLang), translatedText, {
      EX: ttlSeconds,
    });
  }

  return { translatedText, fromCache: false };
}

