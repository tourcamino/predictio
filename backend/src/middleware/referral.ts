import type { Request, Response, NextFunction } from "express";

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

export function referralCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  const cookieName = process.env.REFERRAL_COOKIE_NAME || "predictio_ref";
  const days = Number(process.env.REFERRAL_COOKIE_DAYS || 120);

  const refFromQuery = req.query.ref ? String(req.query.ref).toUpperCase() : null;
  if (!refFromQuery) return next();

  const cookies = parseCookieHeader(req.headers.cookie);
  if (cookies[cookieName] === refFromQuery) return next();

  const maxAgeMs = Math.max(1, days) * 24 * 60 * 60 * 1000;
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=${encodeURIComponent(refFromQuery)}; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}; SameSite=Lax`
  );

  return next();
}

export function getReferralCodeFromRequest(req: Request): string | null {
  const cookieName = process.env.REFERRAL_COOKIE_NAME || "predictio_ref";

  const refFromQuery = req.query.ref ? String(req.query.ref).toUpperCase() : null;
  if (refFromQuery) return refFromQuery;

  const cookies = parseCookieHeader(req.headers.cookie);
  const refFromCookie = cookies[cookieName] ? String(cookies[cookieName]).toUpperCase() : null;
  if (refFromCookie) return refFromCookie;

  const refFromBody =
    (req.body as any)?.refCode || (req.body as any)?.ref || (req.body as any)?.referralCode;
  return refFromBody ? String(refFromBody).toUpperCase() : null;
}

