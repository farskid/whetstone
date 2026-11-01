export type BatchFn<K, V> = (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;

export class Loader<K, V> {
  constructor(batchFn: BatchFn<K, V>) {
    throw new Error('Not implemented');
  }

  load(key: K): Promise<V> {
    throw new Error('Not implemented');
  }
}
