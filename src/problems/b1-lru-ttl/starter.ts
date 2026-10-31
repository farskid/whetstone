export type EvictReason = 'evict' | 'expire' | 'delete' | 'overwrite';

export interface Options<K, V> {
  max: number;
  ttl?: number;
  maxSize?: number;
  sizeOf?: (value: V, key: K) => number;
  onEvict?: (key: K, value: V, reason: EvictReason) => void;
  clock?: { now(): number };
}

export class LRUCache<K, V> {
  constructor(options: Options<K, V>) {
    throw new Error('Not implemented');
  }

  get(key: K): V | undefined { throw new Error('Not implemented'); }
  peek(key: K): V | undefined { throw new Error('Not implemented'); }
  has(key: K): boolean { throw new Error('Not implemented'); }
  set(key: K, value: V, options?: { ttl?: number }): this { throw new Error('Not implemented'); }
  delete(key: K): boolean { throw new Error('Not implemented'); }
  clear(): void { throw new Error('Not implemented'); }
  get size(): number { throw new Error('Not implemented'); }
  keys(): K[] { throw new Error('Not implemented'); }
  purgeStale(): number { throw new Error('Not implemented'); }
}
