import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error.js";

type Hit = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Hit>();

export function rateLimit({ windowMs, max, keyPrefix, message = "Too many requests. Please wait before trying again." }: { windowMs: number; max: number; keyPrefix: string; message?: string }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const identity = req.user?.id ?? req.ip ?? "anonymous";
    const key = `${keyPrefix}:${identity}`;
    const now = Date.now();
    const hit = buckets.get(key);

    if (!hit || hit.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    hit.count += 1;
    if (hit.count > max) {
      return next(new AppError(429, message));
    }

    return next();
  };
}
