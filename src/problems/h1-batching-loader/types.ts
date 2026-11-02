export type BatchFn<K, V> = (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;

export interface LoaderOptions<K, C> {
  /** Cache results per key (default true). With false, every load() goes into a batch. */
  cache?: boolean;
  /** Most keys per batchFn call (default Infinity). */
  maxBatchSize?: number;
  /** Decides when a batch runs. Default: queueMicrotask, so every load() in the same synchronous run shares a batch. */
  batchScheduleFn?: (dispatch: () => void) => void;
  /** Maps a key to its cache key (default: the key itself). */
  cacheKeyFn?: (key: K) => C;
}
