import { createClient } from "redis";

let shared: ReturnType<typeof createClient> | null = null;

/** Shared Redis client when REDIS_URL is set; otherwise null (caller skips cache). */
export async function getRedis() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (!shared) {
    const client = createClient({ url });
    client.on("error", (err) => console.error("[redis]", err));
    try {
      await client.connect();
      shared = client;
    } catch (e) {
      console.warn("[redis] connect failed:", e instanceof Error ? e.message : e);
      return null;
    }
  }

  return shared;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const r = await getRedis();
  if (!r?.isOpen) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  const r = await getRedis();
  if (!r?.isOpen) return;
  try {
    await r.set(key, JSON.stringify(value), { EX: ttlSec });
  } catch (e) {
    console.warn("[redis] set failed:", e instanceof Error ? e.message : e);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const r = await getRedis();
  if (!r?.isOpen) return;
  try {
    await r.del(key);
  } catch {
    /* ignore */
  }
}
