import { randomBytes } from "crypto";
import "dotenv/config";

type NodeEnv = "development" | "production" | "test";
type SameSiteOption = "lax" | "strict" | "none";
export type EmailProvider = "gmail" | "brevo";
type LogLevel =
    | "error"
    | "warn"
    | "info"
    | "http"
    | "verbose"
    | "debug"
    | "silly";

export class Env {
	static readonly DATABASE_URL = Env.requireString("DATABASE_URL");
	static readonly NODE_ENV = Env.requireEnum<NodeEnv>("NODE_ENV", [
		"development",
		"production",
		"test",
	]);
	static readonly PORT = Env.requireNumber("PORT");
	static readonly JWT_SECRET = Env.requireString("JWT_SECRET");
	static readonly JWT_EXPIRES_IN = Env.requireString("JWT_EXPIRES_IN");
	static readonly JWT_REFRESH_EXPIRES_IN = Env.optionalString(
		"JWT_REFRESH_EXPIRES_IN",
		"7d"
	);
	// Only the selected provider's credentials are required. `assertEmailConfig`
	// is called at startup so a bad selection fails fast.
	static readonly EMAIL_PROVIDER = Env.optionalEnum<EmailProvider>(
		"EMAIL_PROVIDER",
		["gmail", "brevo"],
		"gmail"
	);
	static readonly EMAIL_USER = Env.optionalString("EMAIL_USER", "");
	static readonly EMAIL_APP_PASSWORD = Env.optionalString(
		"EMAIL_APP_PASSWORD",
		""
	);
	static readonly CACHE_PROVIDER = Env.optionalString("CACHE_PROVIDER", "memory");
	static readonly REDIS_URL = Env.optionalString("REDIS_URL", "redis://127.0.0.1:6379");
	static readonly REDIS_KEY_PREFIX = Env.optionalString("REDIS_KEY_PREFIX", "auth:");

	// Browser / CORS
	static readonly CORS_ALLOWED_ORIGINS = Env.optionalList(
		"CORS_ALLOWED_ORIGINS",
		["http://localhost:3000", "http://localhost:5173"]
	);
	static readonly CORS_ALLOW_ALL_ORIGINS = Env.optionalBoolean(
		"CORS_ALLOW_ALL_ORIGINS",
		false
	);
	static readonly CORS_MAX_AGE_SECONDS = Env.optionalNumber(
		"CORS_MAX_AGE_SECONDS",
		600
	);
	static readonly FRONTEND_URL = Env.optionalString(
		"FRONTEND_URL",
		"http://localhost:3000"
	);

	// Auth cookies
	static readonly ACCESS_TOKEN_COOKIE_NAME = Env.optionalString(
		"ACCESS_TOKEN_COOKIE_NAME",
		"access_token"
	);
	static readonly REFRESH_TOKEN_COOKIE_NAME = Env.optionalString(
		"REFRESH_TOKEN_COOKIE_NAME",
		"refresh_token"
	);
	static readonly COOKIE_SAMESITE = Env.optionalEnum<SameSiteOption>(
		"COOKIE_SAMESITE",
		["lax", "strict", "none"],
		"lax"
	);
	static readonly COOKIE_SECURE = (() => {
		const secure = Env.optionalBoolean(
			"COOKIE_SECURE",
			Env.NODE_ENV === "production"
		);
		if (Env.COOKIE_SAMESITE === "none" && !secure) {
			throw new Error("COOKIE_SECURE must be true when COOKIE_SAMESITE=none");
		}
		return secure;
	})();
	static readonly COOKIE_DOMAIN = Env.optionalString("COOKIE_DOMAIN", "");

	// CSRF (double-submit cookie)
	static readonly CSRF_COOKIE_NAME = Env.optionalString(
		"CSRF_COOKIE_NAME",
		"csrf_token"
	);
	static readonly CSRF_TOKEN_TTL_MINUTES = Env.optionalNumber(
		"CSRF_TOKEN_TTL_MINUTES",
		60
	);

	// OTP / rate limiting
	static readonly OTP_PEPPER = (() => {
		const pepper = Env.optionalString("OTP_PEPPER", "");
		if (pepper) {
			return pepper;
		}
		if (Env.NODE_ENV === "production") {
			throw new Error("OTP_PEPPER is required in production");
		}
		// A per-process pepper keeps development hashes non-trivial. OTPs do not
		// survive a restart in this mode, which is acceptable outside production.
		return randomBytes(32).toString("hex");
	})();
	static readonly OTP_LENGTH = Env.optionalNumber("OTP_LENGTH", 6);
	static readonly OTP_TTL_MINUTES = Env.optionalNumber("OTP_TTL_MINUTES", 15);
	static readonly OTP_MAX_ATTEMPTS = Env.optionalNumber("OTP_MAX_ATTEMPTS", 5);
	static readonly RATE_LIMIT_WINDOW_MS = Env.optionalNumber(
		"RATE_LIMIT_WINDOW_MS",
		60_000
	);
	static readonly RATE_LIMIT_MAX_REQUESTS = Env.optionalNumber(
		"RATE_LIMIT_MAX_REQUESTS",
		60
	);

	// Password reset
	static readonly PASSWORD_RESET_TOKEN_TTL_MINUTES = Env.optionalNumber(
		"PASSWORD_RESET_TOKEN_TTL_MINUTES",
		30
	);

	// Logging
	static readonly LOG_LEVEL = Env.optionalEnum<LogLevel>(
		"LOG_LEVEL",
		["error", "warn", "info", "http", "verbose", "debug", "silly"],
		Env.NODE_ENV === "production" ? "info" : "debug"
	);
	static readonly LOG_TO_FILE = Env.optionalBoolean("LOG_TO_FILE", false);

	// Optional Brevo SMTP settings (present in .env.example)
	static readonly BREVO_SMTP_HOST = Env.optionalString(
		"BREVO_SMTP_HOST",
		"smtp-relay.brevo.com"
	);
	static readonly BREVO_SMTP_PORT = Env.optionalNumber("BREVO_SMTP_PORT", 587);
	static readonly BREVO_SMTP_LOGIN = Env.optionalString("BREVO_SMTP_LOGIN", "");
	static readonly BREVO_SMTP_KEY = Env.optionalString("BREVO_SMTP_KEY", "");
	static readonly BREVO_SENDER_EMAIL = Env.optionalString("BREVO_SENDER_EMAIL", "");
	static readonly BREVO_SENDER_NAME = Env.optionalString("BREVO_SENDER_NAME", "");

	static assertEmailConfig(): void {
		const missing: string[] = [];

		if (Env.EMAIL_PROVIDER === "gmail") {
			if (!Env.EMAIL_USER) missing.push("EMAIL_USER");
			if (!Env.EMAIL_APP_PASSWORD) missing.push("EMAIL_APP_PASSWORD");
		} else {
			if (!Env.BREVO_SMTP_LOGIN) missing.push("BREVO_SMTP_LOGIN");
			if (!Env.BREVO_SMTP_KEY) missing.push("BREVO_SMTP_KEY");
			if (!Env.BREVO_SENDER_EMAIL) missing.push("BREVO_SENDER_EMAIL");
		}

		if (missing.length > 0) {
			throw new Error(
				`Missing ${Env.EMAIL_PROVIDER} email configuration: ${missing.join(", ")}`
			);
		}
	}

	private static requireString(name: string): string {
		const value = process.env[name];
		if (!value) {
			throw new Error(`${name} is missing or empty in .env`);
		}
		return value;
	}

	private static requireNumber(name: string): number {
		const raw = Env.requireString(name);
		const value = Number(raw);
		if (!Number.isFinite(value)) {
			throw new Error(`${name} must be a valid number`);
		}
		return value;
	}

	private static requireEnum<T extends string>(
		name: string,
		allowed: readonly T[]
	): T {
		const value = Env.requireString(name) as T;
		if (!allowed.includes(value)) {
			throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
		}
		return value;
	}

	private static optionalString(name: string, fallback: string): string {
		const value = process.env[name];
		return value && value.length > 0 ? value : fallback;
	}

	private static optionalNumber(name: string, fallback: number): number {
		const raw = process.env[name];
		if (!raw || raw.length === 0) {
			return fallback;
		}

		const value = Number(raw);
		if (!Number.isFinite(value)) {
			throw new Error(`${name} must be a valid number`);
		}

		return value;
	}

	private static optionalEnum<T extends string>(
		name: string,
		allowed: readonly T[],
		fallback: T
	): T {
		const value = process.env[name];
		if (!value || value.length === 0) {
			return fallback;
		}

		if (!allowed.includes(value as T)) {
			throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
		}

		return value as T;
	}

	private static optionalBoolean(name: string, fallback: boolean): boolean {
		const raw = process.env[name];
		if (!raw || raw.length === 0) {
			return fallback;
		}

		if (raw === "true") {
			return true;
		}

		if (raw === "false") {
			return false;
		}

		throw new Error(`${name} must be either "true" or "false"`);
	}

	private static optionalList(name: string, fallback: string[]): string[] {
		const raw = process.env[name];
		if (!raw || raw.length === 0) {
			return fallback;
		}

		return raw
			.split(",")
			.map((value) => value.trim())
			.filter((value) => value.length > 0);
	}
}
