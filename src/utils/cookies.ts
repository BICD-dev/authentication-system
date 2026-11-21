import type { CookieOptions, Request, Response } from "express";
import { Env } from "../config/env";
import { parseDurationToMs } from "./time";

export interface AuthCookies {
	accessToken: string;
	refreshToken: string;
}

function baseCookieOptions(): CookieOptions {
	const options: CookieOptions = {
		httpOnly: true,
		secure: Env.COOKIE_SECURE,
		sameSite: Env.COOKIE_SAMESITE,
		path: "/",
	};

	if (Env.COOKIE_DOMAIN) {
		options.domain = Env.COOKIE_DOMAIN;
	}

	return options;
}

export function getCookie(req: Request, name: string): string | null {
	const value = req.cookies?.[name];
	return typeof value === "string" ? value : null;
}

/**
 * Set both authentication cookies. The access token is short-lived and the
 * refresh token is long-lived; both are httpOnly by default.
 */
export function setAuthCookies(res: Response, tokens: AuthCookies): void {
	const options = baseCookieOptions();

	res.cookie(Env.ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, {
		...options,
		maxAge: parseDurationToMs(Env.JWT_EXPIRES_IN),
	});

	res.cookie(Env.REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
		...options,
		maxAge: parseDurationToMs(Env.JWT_REFRESH_EXPIRES_IN),
	});
}

export function clearAuthCookies(res: Response): void {
	const options = baseCookieOptions();

	res.clearCookie(Env.ACCESS_TOKEN_COOKIE_NAME, options);
	res.clearCookie(Env.REFRESH_TOKEN_COOKIE_NAME, options);
}

/**
 * The CSRF token must be readable by browser JavaScript, so this cookie is
 * deliberately not httpOnly. It uses the same site/secure policy as auth cookies.
 */
export function setCsrfCookie(res: Response, token: string): void {
	const options: CookieOptions = {
		httpOnly: false,
		secure: Env.COOKIE_SECURE,
		sameSite: Env.COOKIE_SAMESITE,
		path: "/",
		maxAge: Env.CSRF_TOKEN_TTL_MINUTES * 60_000,
	};

	if (Env.COOKIE_DOMAIN) {
		options.domain = Env.COOKIE_DOMAIN;
	}

	res.cookie(Env.CSRF_COOKIE_NAME, token, options);
}
