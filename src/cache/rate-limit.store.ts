import type {
    ClientRateLimitInfo,
    Options,
    Store,
} from "express-rate-limit";
import type { CacheStore } from "./cache.store";

type RateLimitRecord = {
    totalHits: number;
    resetTime: number;
};

/**
 * A shared express-rate-limit store backed by the configured cache provider.
 *
 * With CACHE_PROVIDER=redis the counters are visible to every process, so the
 * limits hold across instances. With the memory provider they stay local to
 * the process, which is only suitable for single-instance deployments.
 */
export class SharedRateLimitStore implements Store {
    private windowMs = 60_000;

    constructor(
        private readonly cache: CacheStore,
        private readonly name: string,
    ) {}

    init(options: Options): void {
        this.windowMs = options.windowMs;
    }

    private cacheKey(key: string): string {
        return `rate-limit:${this.name}:${key}`;
    }

    private async read(key: string): Promise<RateLimitRecord | null> {
        const raw = await this.cache.get(this.cacheKey(key));
        if (!raw) {
            return null;
        }

        try {
            const record = JSON.parse(raw) as RateLimitRecord;
            if (
                !Number.isFinite(record.totalHits) ||
                !Number.isFinite(record.resetTime)
            ) {
                return null;
            }
            return record;
        } catch {
            return null;
        }
    }

    private async write(key: string, record: RateLimitRecord): Promise<void> {
        const ttlSeconds = Math.max(
            1,
            Math.ceil((record.resetTime - Date.now()) / 1000),
        );
        await this.cache.set(this.cacheKey(key), JSON.stringify(record), ttlSeconds);
    }

    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
        const record = await this.read(key);
        if (!record || record.resetTime <= Date.now()) {
            return undefined;
        }

        return {
            totalHits: record.totalHits,
            resetTime: new Date(record.resetTime),
        };
    }

    async increment(key: string): Promise<ClientRateLimitInfo> {
        const now = Date.now();
        const existing = await this.read(key);
        const record: RateLimitRecord =
            existing && existing.resetTime > now
                ? { ...existing, totalHits: existing.totalHits + 1 }
                : { totalHits: 1, resetTime: now + this.windowMs };

        await this.write(key, record);
        return {
            totalHits: record.totalHits,
            resetTime: new Date(record.resetTime),
        };
    }

    async decrement(key: string): Promise<void> {
        const record = await this.read(key);
        if (!record || record.resetTime <= Date.now()) {
            return;
        }

        record.totalHits = Math.max(0, record.totalHits - 1);
        await this.write(key, record);
    }

    async resetKey(key: string): Promise<void> {
        await this.cache.del(this.cacheKey(key));
    }
}
