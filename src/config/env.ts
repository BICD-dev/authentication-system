import "dotenv/config";

type NodeEnv = "development" | "production" | "test";

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
	static readonly EMAIL_USER = Env.requireString("EMAIL_USER");
	static readonly EMAIL_APP_PASSWORD = Env.requireString("EMAIL_APP_PASSWORD");
	static readonly EMAIL_PROVIDER = Env.requireString("EMAIL_PROVIDER");

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


}