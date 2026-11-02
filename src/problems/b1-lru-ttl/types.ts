export type EvictReason = 'evict' | 'expire' | 'delete' | 'overwrite';

export interface Options<K, V> {
  max: number;
  ttl?: number;
  maxSize?: number;
  sizeOf?: (value: V, key: K) => number;
  onEvict?: (key: K, value: V, reason: EvictReason) => void;
  clock?: { now(): number };
}
