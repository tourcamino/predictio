import type { Eip1193Provider } from "./eip1193Types";

const DEFAULT_MS = 12_000;

export async function eip1193RequestWithTimeout<T>(
  provider: Eip1193Provider,
  method: string,
  params?: unknown[],
  timeoutMs = DEFAULT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      provider.request({ method, params }) as Promise<T>,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Wallet request timed out (${method}). Unlock MetaMask and try again.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
