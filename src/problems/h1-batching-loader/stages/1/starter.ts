import type { BatchFn } from './types';

export class Loader<K, V> {
  constructor(batchFn: BatchFn<K, V>) {
    throw new Error('Not implemented');
  }

  load(key: K): Promise<V> {
    throw new Error('Not implemented');
  }
}
