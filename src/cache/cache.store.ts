export interface CacheStore {
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  /** Implemented by stores that need a connection (for example Redis). */
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}
