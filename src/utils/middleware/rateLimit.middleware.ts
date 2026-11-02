import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
};

const defaultOptions: Required<RateLimitOptions> = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyGenerator: (req) => req.ip || "unknown",
  message: "Too many requests. Please try again later.",
};

export const rateLimitMiddleware = (options: RateLimitOptions = {}) => {
  const config = { ...defaultOptions, ...options };
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const key = config.keyGenerator(req);
      const now = Date.now();
      const current = hits.get(key);

      if (!current || now >= current.resetAt) {
        hits.set(key, {
          count: 1,
          resetAt: now + config.windowMs,
        });
        next();
        return;
      }

      if (current.count >= config.maxRequests) {
        res.status(429).json({
          success: false,
          statusCode: 429,
          message: config.message,
        });
        return;
      }

      current.count += 1;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Rate limit middleware error"));
    }
  };
};
