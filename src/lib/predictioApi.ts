type ApiErrorShape = {
  error?: {
    code?: string;
    message?: string;
    path?: string;
    requestId?: string;
  };
};

/** Express REST (`/api/v1/*`, `/api/admin/*`, …). In local dev the backend runs on a separate port from Vinxi (see backend `PORT`, default 3001). */
const DEFAULT_DEV_BACKEND = 'http://127.0.0.1:3001';

/** Vinxi/Vite dev + preview: SPA runs on these ports while Express stays on 3001. Do not rely on `import.meta.env.DEV` — it is often false in Vinxi client bundles. */
export function isLocalFrontendDevOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, port } = window.location;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return false;
  const p = port || '';
  return ['5173', '5174', '3000', '4173', '3050'].includes(p);
}

/** Matches backend dev fallback: `BOT_API_KEY` default `dev_bot_key` for `X-Admin-Key` when `ADMIN_SECRET` unset. */
export function getLocalDevAdminSecretFallback(): string | undefined {
  if (!isLocalFrontendDevOrigin()) return undefined;
  return 'dev_bot_key';
}

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  let fromEnv = envUrl?.trim();
  if (fromEnv) fromEnv = fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '');
    // Common mistake: VITE_API_URL=http://localhost:5173 — that is the SPA, not Express.
    if (fromEnv && fromEnv === origin && isLocalFrontendDevOrigin()) {
      return DEFAULT_DEV_BACKEND;
    }
    if (fromEnv) return fromEnv;

    if (isLocalFrontendDevOrigin()) return DEFAULT_DEV_BACKEND;
    return window.location.origin;
  }

  return fromEnv || DEFAULT_DEV_BACKEND;
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

