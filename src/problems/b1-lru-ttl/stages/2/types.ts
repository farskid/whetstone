/** Where the cache reads the time. Default: Date. */
export interface Clock {
  now(): number;
}

/** Options for `new LRUCache(options)`. */
export interface Options<K, V> {
  max: number;
  ttl?: number;
  clock?: Clock;
}

/** Options for `set(key, value, options)`. */
export interface SetOptions {
  /** This entry's ttl in ms, overriding the cache's default. */
  ttl?: number;
}
