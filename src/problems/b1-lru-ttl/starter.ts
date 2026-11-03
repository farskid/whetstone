import type { EvictReason, Options, SetOptions } from './types';

export class LRUCache<K, V> {
  constructor(options: Options<K, V>) {
    throw new Error('Not implemented');
  }

  get(key: K): V | undefined { throw new Error('Not implemented'); }
  peek(key: K): V | undefined { throw new Error('Not implemented'); }
  has(key: K): boolean { throw new Error('Not implemented'); }
  set(key: K, value: V, options?: SetOptions): this { throw new Error('Not implemented'); }
  delete(key: K): boolean { throw new Error('Not implemented'); }
  clear(): void { throw new Error('Not implemented'); }
  get size(): number { throw new Error('Not implemented'); }
  keys(): K[] { throw new Error('Not implemented'); }
  purgeStale(): number { throw new Error('Not implemented'); }
}
