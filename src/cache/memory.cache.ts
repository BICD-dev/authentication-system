import { CacheStore } from "./cache.store";

export class MemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async set(key: string, value: string, ttlSeconds?: number) {
    const expiresAt = ttlSeconds
      ? Date.now() + ttlSeconds * 1000
      : undefined;

    this.store.set(key, { value, expiresAt });
  }

  async get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async del(key: string) {
    this.store.delete(key);
  }
}