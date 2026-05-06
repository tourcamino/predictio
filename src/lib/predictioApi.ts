type ApiErrorShape = {
  error?: {
    code?: string;
    message?: string;
    path?: string;
    requestId?: string;
  };
};

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  const fromEnv = envUrl?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://127.0.0.1:3001';
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function apiRequest<T>(
  path: string,
  opts: {
    method?: string;
    body?: any;
    developerApiKey?: string;
    adminApiKey?: string;
    /** Founder/admin REST routes (`X-Admin-Key`, maps to server ADMIN_SECRET). */
    adminSecretKey?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: ApiErrorShape | any }> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {};

  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.developerApiKey) headers.authorization = `Bearer ${opts.developerApiKey}`;
  if (opts.adminApiKey) headers['x-predictio-key'] = opts.adminApiKey;
  if (opts.adminSecretKey) headers['x-admin-key'] = opts.adminSecretKey;

  const ac = new AbortController();
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? Number(opts.timeoutMs) : 10_000;
  const t = setTimeout(() => ac.abort(), timeoutMs);

  const res = await fetch(url, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal || ac.signal,
  });
  clearTimeout(t);

  const json = await readJsonSafe(res);
  if (!res.ok) return { ok: false, status: res.status, error: json };
  return { ok: true, data: json as T };
}

