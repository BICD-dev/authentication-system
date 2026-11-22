import { createClient, type RedisClientType } from "redis";
import { logger } from "../config/logger";
import { CacheStore } from "./cache.store";

export class RedisCacheStore implements CacheStore {
	private readonly client: RedisClientType;
	private readonly keyPrefix: string;
	private connection: Promise<void> | null = null;

	constructor(redisUrl: string, keyPrefix: string = "auth:") {
		this.client = createClient({ url: redisUrl });
		this.keyPrefix = keyPrefix;

		this.client.on("error", (error) => {
			logger.error("Redis client error", {
				name: error.name,
				message: error.message,
				stack: error.stack,
			});
		});
	}

	private getKey(key: string): string {
		return `${this.keyPrefix}${key}`;
	}

	async connect(): Promise<void> {
		if (this.client.isOpen) {
			return;
		}

		if (!this.connection) {
			this.connection = this.client.connect()
				.then(() => undefined)
				.finally(() => {
					this.connection = null;
				});
		}

		await this.connection;
	}

	/** Stores created by CacheFactory may be used before bootstrap connects them. */
	private async ensureConnected(): Promise<void> {
		await this.connect();
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		await this.ensureConnected();

		const namespacedKey = this.getKey(key);
		if (ttlSeconds && ttlSeconds > 0) {
			await this.client.set(namespacedKey, value, { EX: ttlSeconds });
			return;
		}

		await this.client.set(namespacedKey, value);
	}

	async get(key: string): Promise<string | null> {
		await this.ensureConnected();
		return this.client.get(this.getKey(key));
	}

	async del(key: string): Promise<void> {
		await this.ensureConnected();
		await this.client.del(this.getKey(key));
	}

	async disconnect(): Promise<void> {
		if (this.client.isOpen) {
			await this.client.quit();
		}
	}
}

