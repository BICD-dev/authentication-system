import "dotenv/config";

type NodeEnv = "development" | "production" | "test";
type SameSiteOption = "lax" | "strict" | "none";

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
	static readonly EMAIL_USER = Env.requireString("EMAIL_USER");
	static readonly EMAIL_APP_PASSWORD = Env.requireString("EMAIL_APP_PASSWORD");
	static readonly EMAIL_PROVIDER = Env.requireString("EMAIL_PROVIDER");
	static readonly CACHE_PROVIDER = Env.optionalString("CACHE_PROVIDER", "memory");
	static readonly REDIS_URL = Env.optionalString("REDIS_URL", "redis://127.0.0.1:6379");
	static readonly REDIS_KEY_PREFIX = Env.optionalString("REDIS_KEY_PREFIX", "auth:");

	// Browser / CORS
	static readonly CORS_ALLOWED_ORIGINS = Env.optionalList(
		"CORS_ALLOWED_ORIGINS",
		["http://localhost:3000", "http://localhost:5173"]
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
	static readonly COOKIE_SECURE = Env.optionalBoolean(
		"COOKIE_SECURE",
		Env.NODE_ENV === "production"
	);
	static readonly COOKIE_DOMAIN = Env.optionalString("COOKIE_DOMAIN", "");

	// OTP / rate limiting
	static readonly OTP_PEPPER = Env.optionalString("OTP_PEPPER", "");
	static readonly RATE_LIMIT_WINDOW_MS = Env.optionalNumber(
		"RATE_LIMIT_WINDOW_MS",
		60_000
	);
	static readonly RATE_LIMIT_MAX_REQUESTS = Env.optionalNumber(
		"RATE_LIMIT_MAX_REQUESTS",
		60
	);

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
