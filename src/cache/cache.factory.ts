import { Env } from "../config/env";
import { CacheStore } from "./cache.store";
import { MemoryCacheStore } from "./memory.cache";
import { RedisCacheStore } from "./redis.cache";

export class CacheFactory {
  private static cacheStore: CacheStore | null = null;

  static createCacheStore(): CacheStore {
    if (CacheFactory.cacheStore) {
      return CacheFactory.cacheStore;
    }

    const provider = Env.CACHE_PROVIDER.toLowerCase();

    if (provider === "redis") {
      CacheFactory.cacheStore = new RedisCacheStore(
        Env.REDIS_URL,
        Env.REDIS_KEY_PREFIX,
      );
      return CacheFactory.cacheStore;
    }

    CacheFactory.cacheStore = new MemoryCacheStore();
    return CacheFactory.cacheStore;
  }
}
