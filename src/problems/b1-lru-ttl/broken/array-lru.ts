// Broken: correct LRU semantics, but recency is an array (O(n) per op), TTL ignores
// per-entry overrides, and onEvict never reports 'overwrite'.
export type EvictReason = 'evict' | 'expire' | 'delete' | 'overwrite';
export interface Options<K, V> {
  max: number; ttl?: number; maxSize?: number; sizeOf?: (value: V, key: K) => number;
  onEvict?: (key: K, value: V, reason: EvictReason) => void; clock?: { now(): number };
}
export class LRUCache<K, V> {
  private order: K[] = [];
  private data = new Map<K, { v: V; at: number }>();
  constructor(private o: Options<K, V>) {}
  private now() { return (this.o.clock ?? Date).now(); }
  private stale(k: K) { const e = this.data.get(k)!; return !!this.o.ttl && this.now() >= e.at + this.o.ttl; }
  private drop(k: K, r: EvictReason) { const e = this.data.get(k)!; this.data.delete(k); this.order.splice(this.order.indexOf(k), 1); this.o.onEvict?.(k, e.v, r); }
  private live(k: K) { if (!this.data.has(k)) return false; if (this.stale(k)) { this.drop(k, 'expire'); return false; } return true; }
  get(k: K) { if (!this.live(k)) return undefined; this.order.splice(this.order.indexOf(k), 1); this.order.unshift(k); return this.data.get(k)!.v; }
  peek(k: K) { return this.live(k) ? this.data.get(k)!.v : undefined; }
  has(k: K) { return this.live(k); }
  set(k: K, v: V, _o?: { ttl?: number }): this {
    if (this.data.has(k)) this.order.splice(this.order.indexOf(k), 1);
    this.data.set(k, { v, at: this.now() }); this.order.unshift(k);
    while (this.order.length > this.o.max) this.drop(this.order[this.order.length - 1], 'evict');
    return this;
  }
  delete(k: K) { if (!this.live(k)) return false; this.drop(k, 'delete'); return true; }
  clear() { [...this.order].forEach((k) => this.drop(k, 'delete')); }
  get size() { this.purgeStale(); return this.order.length; }
  keys() { this.purgeStale(); return [...this.order]; }
  purgeStale() { const s = this.order.filter((k) => this.stale(k)); s.forEach((k) => this.drop(k, 'expire')); return s.length; }
}
