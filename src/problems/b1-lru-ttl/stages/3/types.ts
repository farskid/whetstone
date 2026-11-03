/** Where the cache reads the time. Default: Date. */
export interface Clock {
  now(): number;
}

export type EvictReason = 'evict' | 'expire' | 'delete' | 'overwrite';

export interface Options<K, V> {
  max: number;
  ttl?: number;
  onEvict?: (key: K, value: V, reason: EvictReason) => void;
  clock?: Clock;
}

/** Options for `set(key, value, options)`. */
export interface SetOptions {
  /** This entry's ttl in ms, overriding the cache's default. */
  ttl?: number;
}
