import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validate(opts: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (opts.body) req.body = opts.body.parse(req.body);
      if (opts.query) req.query = opts.query.parse(req.query);
      if (opts.params) req.params = opts.params.parse(req.params);
      return next();
    } catch (e) {
      return next(e);
    }
  };
}

