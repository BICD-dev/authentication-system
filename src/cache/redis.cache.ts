import { createClient, type RedisClientType } from "redis";
import { CacheStore } from "./cache.store";

export class RedisCacheStore implements CacheStore {
	private readonly client: RedisClientType;
	private readonly keyPrefix: string;

	constructor(redisUrl: string, keyPrefix: string = "auth:") {
		this.client = createClient({ url: redisUrl });
		this.keyPrefix = keyPrefix;

		this.client.on("error", (error) => {
			console.error("Redis client error:", error);
		});
	}

	private getKey(key: string): string {
		return `${this.keyPrefix}${key}`;
	}

	async connect(): Promise<void> {
		if (!this.client.isOpen) {
			await this.client.connect();
		}
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {

		const namespacedKey = this.getKey(key);
		if (ttlSeconds && ttlSeconds > 0) {
			await this.client.set(namespacedKey, value, { EX: ttlSeconds });
			return;
		}

		await this.client.set(namespacedKey, value);
	}

	async get(key: string): Promise<string | null> {
		return this.client.get(this.getKey(key));
	}

	async del(key: string): Promise<void> {
		await this.client.del(this.getKey(key));
	}

	async disconnect(): Promise<void> {
		if (this.client.isOpen) {
			await this.client.quit();
		}
	}
}

// Backward-compatible export in case RedisCache is already referenced elsewhere.
export class RedisCache extends RedisCacheStore {}