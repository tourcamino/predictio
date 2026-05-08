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

  if (err instanceof Error && err.message === "CORS blocked") {
    return res.status(403).json({
      error: {
        code: "CORS_BLOCKED",
        message: "CORS origin not allowed",
        requestId: res.locals.requestId,
      },
    });
  }

  // Invalid JSON body (Express body parser)
  if (
    err instanceof SyntaxError &&
    // body-parser sets this on JSON parse failures
    (err as any).type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON body",
        requestId: res.locals.requestId,
      },
    });
  }

  // JSON body too large (body-parser)
  if (err && typeof err === "object" && (err as any).type === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body too large",
        requestId: res.locals.requestId,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: err.flatten(),
        path: res.req?.path,
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
        path: res.req?.path,
        requestId: res.locals.requestId,
      },
    });
  }

  const message = err instanceof Error ? err.message : "Unknown error";
   
  console.error("[api] unhandled error", err);

  return res.status(500).json({
    error: {
      code: "INTERNAL",
      message,
      path: res.req?.path,
      requestId: res.locals.requestId,
    },
  });
}

