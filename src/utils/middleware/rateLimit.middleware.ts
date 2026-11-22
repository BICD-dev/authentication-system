import expressRateLimit, {
    ipKeyGenerator,
    type Options,
    type RateLimitRequestHandler,
    type Store,
} from "express-rate-limit";
import { CacheFactory } from "../../cache";
import { SharedRateLimitStore } from "../../cache/rate-limit.store";
import { Env } from "../../config/env";
import { HttpStatus } from "../../constant/http-status.enum";
import { ResponseDto } from "../../dtos/response.dto";

const DEFAULT_MESSAGE = "Too many requests. Please try again later.";

export type RateLimitOptions = Omit<
    Partial<Options>,
    "handler" | "message" | "store"
> & {
    message?: string;
    /** Namespaces this limiter's counters in the shared store. */
    storeName?: string;
    store?: Store;
};

export type RateLimitTier = "strict" | "moderate" | "lax";

/**
 * Reusable limits, from most to least restrictive.
 *
 * `strict` is for brute-force sensitive endpoints (login, signup, OTP verify,
 * password reset). `moderate` is for write endpoints that need throttling but
 * not aggressive lockout. `lax` is for general API traffic and is tunable with
 * `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS`.
 */
export const RATE_LIMIT_PRESETS: Record<RateLimitTier, RateLimitOptions> = {
    strict: {
        windowMs: 15 * 60_000,
        limit: 5,
        message: "Too many attempts. Please try again later.",
    },
    moderate: {
        windowMs: 15 * 60_000,
        limit: 20,
        message: "Too many requests. Please try again later.",
    },
    lax: {
        windowMs: Env.RATE_LIMIT_WINDOW_MS,
        limit: Env.RATE_LIMIT_MAX_REQUESTS,
        message: DEFAULT_MESSAGE,
    },
};

const sharedStore = (name: string): Store =>
    new SharedRateLimitStore(CacheFactory.createCacheStore(), name);

/**
 * Thin wrapper around express-rate-limit that keeps auth rate-limit responses
 * in the same envelope as the rest of the API. Counters live in the configured
 * cache provider and IPv6 clients are grouped by subnet via `ipKeyGenerator`.
 */
export const rateLimitMiddleware = (
    options: RateLimitOptions = {},
): RateLimitRequestHandler => {
    const {
        message = DEFAULT_MESSAGE,
        statusCode = HttpStatus.TOO_MANY_REQUESTS,
        storeName,
        store = sharedStore(storeName ?? "default"),
        keyGenerator = (req) => ipKeyGenerator(req.ip ?? "unknown"),
        ...rest
    } = options;

    return expressRateLimit({
        standardHeaders: "draft-7",
        legacyHeaders: false,
        ...rest,
        store,
        keyGenerator,
        statusCode,
        handler: (_req, res) => {
            const resObj = ResponseDto.failure(statusCode, message);
            res.status(statusCode).json(resObj);
        },
    });
};

/**
 * Build a limiter from a preset. Any option can be overridden, which is how
 * per-email or per-token limits are added without defining a new preset:
 *
 * ```ts
 * rateLimit("strict", { keyGenerator: (req) => `email:${req.body.email}` })
 * ```
 */
export const rateLimit = (
    tier: RateLimitTier,
    options: RateLimitOptions = {},
): RateLimitRequestHandler =>
    rateLimitMiddleware({ ...RATE_LIMIT_PRESETS[tier], ...options });

/**
 * Ready-to-use limiters. Each one has its own store namespace, so attaching a
 * named limiter to an endpoint gives that endpoint an independent budget that
 * is still shared across application instances.
 *
 * `strict` is kept as the shared limiter for the two password-reset routes.
 */
export const rateLimiters = {
    strict: rateLimit("strict"),
    moderate: rateLimit("moderate"),
    lax: rateLimit("lax"),
} satisfies Record<RateLimitTier, RateLimitRequestHandler>;
