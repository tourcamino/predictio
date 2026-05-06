import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (client) return client;

  client = createClient({ url });

  client.on("error", (err) => {
    // Don't crash the API on Redis issues; treat as cache miss.
    console.error("[redis] error", err);
  });

  await client.connect();
  return client;
}

