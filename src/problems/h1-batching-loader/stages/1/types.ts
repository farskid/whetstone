export type BatchFn<K, V> = (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;
