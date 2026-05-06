import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = res.locals.requestId;

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const ip =
      // trust proxy might be enabled; express will populate req.ip
      req.ip ||
      (req.socket?.remoteAddress ?? "unknown");

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        at: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status,
        ms,
        ip,
        walletAddress: (req as any).walletAddress,
        apiKeyId: (req as any).apiKey?.id,
        ua: req.headers["user-agent"],
      }),
    );
  });

  next();
}

