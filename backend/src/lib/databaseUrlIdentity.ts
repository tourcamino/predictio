/** Non-secret DATABASE_URL fingerprint for runtime divergence audits. */
export type DatabaseUrlIdentity = {
  configured: boolean;
  host?: string;
  port?: string;
  database?: string;
  user?: string;
  sslmode?: string | null;
  parseError?: boolean;
};

export function getDatabaseUrlIdentity(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseUrlIdentity {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) return { configured: false };
  try {
    const u = new URL(raw);
    return {
      configured: true,
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, "") || undefined,
      user: u.username || undefined,
      sslmode: u.searchParams.get("sslmode"),
    };
  } catch {
    return { configured: true, parseError: true };
  }
}
