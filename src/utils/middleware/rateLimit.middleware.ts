import expressRateLimit, {
    type Options,
    type RateLimitRequestHandler,
} from "express-rate-limit";
import { Env } from "../../config/env";
import { HttpStatus } from "../../constant/http-status.enum";
import { ResponseDto } from "../../dtos/response.dto";

const DEFAULT_MESSAGE = "Too many requests. Please try again later.";

export type RateLimitOptions = Omit<Partial<Options>, "handler" | "message"> & {
    message?: string;
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

/**
 * Thin wrapper around express-rate-limit that keeps auth rate-limit responses
 * in the same envelope as the rest of the API.
 */
export const rateLimitMiddleware = (
    options: RateLimitOptions = {}
): RateLimitRequestHandler => {
    const {
        message = DEFAULT_MESSAGE,
        statusCode = HttpStatus.TOO_MANY_REQUESTS,
        ...rest
    } = options;

    return expressRateLimit({
        standardHeaders: "draft-7",
        legacyHeaders: false,
        ...rest,
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
    options: RateLimitOptions = {}
): RateLimitRequestHandler =>
    rateLimitMiddleware({ ...RATE_LIMIT_PRESETS[tier], ...options });

/**
 * Ready-to-use IP-based limiters.
 *
 * ```ts
 * router.post("/login", rateLimiters.strict, controller.login)
 * router.get("/feed", rateLimiters.lax, controller.feed)
 * ```
 *
 * An instance keeps one counter per client, so attaching the same instance to
 * several routes gives them a shared budget. Build a new one with
 * `rateLimit(tier)` when each route needs its own counter.
 */
export const rateLimiters = {
    strict: rateLimit("strict"),
    moderate: rateLimit("moderate"),
    lax: rateLimit("lax"),
} satisfies Record<RateLimitTier, RateLimitRequestHandler>;
