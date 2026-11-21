import { createHash, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { Env } from "../../config/env";
import { HttpStatus } from "../../constant/http-status.enum";
import { getCookie } from "../cookies";
import { AppError } from "./errorHandler";

export const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hasBearerToken(req: Request): boolean {
    return /^Bearer\s+\S+$/i.test(req.headers.authorization ?? "");
}

function isCookieAuthenticated(req: Request): boolean {
    return (
        getCookie(req, Env.ACCESS_TOKEN_COOKIE_NAME) !== null ||
        getCookie(req, Env.REFRESH_TOKEN_COOKIE_NAME) !== null
    );
}

/**
 * Hash before comparing so both buffers always have the same length; otherwise
 * timingSafeEqual would throw on differently sized tokens.
 */
function tokensMatch(expected: string, provided: string): boolean {
    const expectedHash = createHash("sha256").update(expected).digest();
    const providedHash = createHash("sha256").update(provided).digest();
    return timingSafeEqual(expectedHash, providedHash);
}

/**
 * Double-submit CSRF check. It only applies to unsafe requests that rely on
 * auth cookies; Bearer-token clients and unauthenticated requests are skipped.
 */
export const csrfProtection = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (
        SAFE_METHODS.has(req.method) ||
        hasBearerToken(req) ||
        !isCookieAuthenticated(req)
    ) {
        next();
        return;
    }

    const cookieToken = getCookie(req, Env.CSRF_COOKIE_NAME);
    const headerToken = req.get(CSRF_HEADER_NAME);

    if (
        !cookieToken ||
        !headerToken ||
        !tokensMatch(cookieToken, headerToken)
    ) {
        next(new AppError(HttpStatus.FORBIDDEN, "Invalid or missing CSRF token"));
        return;
    }

    next();
};
