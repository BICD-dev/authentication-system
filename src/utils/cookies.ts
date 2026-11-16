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

export function parseCookies(header: string | undefined): Record<string, string> {
	const cookies: Record<string, string> = {};

	if (!header) {
		return cookies;
	}

	for (const part of header.split(";")) {
		const separatorIndex = part.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const name = part.slice(0, separatorIndex).trim();
		if (!name) {
			continue;
		}

		const rawValue = part.slice(separatorIndex + 1).trim();
		try {
			cookies[name] = decodeURIComponent(rawValue);
		} catch {
			cookies[name] = rawValue;
		}
	}

	return cookies;
}

export function getCookie(req: Request, name: string): string | null {
	const cookies = parseCookies(req.headers.cookie);
	return cookies[name] ?? null;
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
