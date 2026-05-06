import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, opts: { status: number; code: string; details?: unknown }) {
    super(message);
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Not found",
      path: req.path,
      requestId: res.locals.requestId,
    },
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: err.flatten(),
        requestId: res.locals.requestId,
      },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: res.locals.requestId,
      },
    });
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  // eslint-disable-next-line no-console
  console.error("[api] unhandled error", err);

  return res.status(500).json({
    error: {
      code: "INTERNAL",
      message,
      requestId: res.locals.requestId,
    },
  });
}

