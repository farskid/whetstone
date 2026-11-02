import type { BatchFn, LoaderOptions } from './types';

export class Loader<K, V, C = K> {
  constructor(batchFn: BatchFn<K, V>, options: LoaderOptions<K, C> = {}) {
    throw new Error('Not implemented');
  }

  load(key: K): Promise<V> {
    throw new Error('Not implemented');
  }

  loadMany(keys: readonly K[]): Promise<(V | Error)[]> {
    throw new Error('Not implemented');
  }

  clear(key: K): this {
    throw new Error('Not implemented');
  }

  clearAll(): this {
    throw new Error('Not implemented');
  }

  prime(key: K, value: V): this {
    throw new Error('Not implemented');
  }
}
