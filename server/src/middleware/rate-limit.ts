import type { RequestHandler } from "express";

import { HttpError } from "../lib/errors.js";

type RateLimitConfig = {
  key: string;
  windowMs: number;
  maxRequests: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, Entry>();

export const createRateLimitMiddleware = (
  config: RateLimitConfig,
): RequestHandler => {
  return (req, _res, next): void => {
    const now = Date.now();
    const subject = `${config.key}:${req.ip ?? "unknown"}`;
    const existing = rateLimitStore.get(subject);

    if (!existing || existing.resetAt <= now) {
      rateLimitStore.set(subject, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      next();
      return;
    }

    if (existing.count >= config.maxRequests) {
      next(new HttpError(429, "Too many requests"));
      return;
    }

    existing.count += 1;
    rateLimitStore.set(subject, existing);
    next();
  };
};
