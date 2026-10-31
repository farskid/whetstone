export type EvictReason = 'evict' | 'expire' | 'delete' | 'overwrite';

export interface Options<K, V> {
  max: number;
  ttl?: number;
  maxSize?: number;
  sizeOf?: (value: V, key: K) => number;
  onEvict?: (key: K, value: V, reason: EvictReason) => void;
  clock?: { now(): number };
}

interface Entry<K, V> {
  key: K;
  value: V;
  size: number;
  expiresAt: number; // Infinity = never
  prev: Entry<K, V> | null; // towards most recent
  next: Entry<K, V> | null; // towards least recent
}

// A Map for O(1) lookup plus a doubly linked list for O(1) recency updates.
export class LRUCache<K, V> {
  private map = new Map<K, Entry<K, V>>();
  private head: Entry<K, V> | null = null; // most recent
  private tail: Entry<K, V> | null = null; // least recent
  private totalSize = 0;
  private readonly opts: Options<K, V>;
  private readonly clock: { now(): number };

  constructor(options: Options<K, V>) {
    if (!Number.isInteger(options.max) || options.max < 1) throw new TypeError('max must be an integer >= 1');
    this.opts = options;
    this.clock = options.clock ?? Date;
  }

  private unlink(e: Entry<K, V>) {
    if (e.prev) e.prev.next = e.next; else this.head = e.next;
    if (e.next) e.next.prev = e.prev; else this.tail = e.prev;
    e.prev = e.next = null;
  }

  private pushFront(e: Entry<K, V>) {
    e.next = this.head;
    e.prev = null;
    if (this.head) this.head.prev = e;
    this.head = e;
    if (!this.tail) this.tail = e;
  }

  private remove(e: Entry<K, V>, reason: EvictReason) {
    this.unlink(e);
    this.map.delete(e.key);
    this.totalSize -= e.size;
    this.opts.onEvict?.(e.key, e.value, reason);
  }

  private isStale(e: Entry<K, V>) {
    return this.clock.now() >= e.expiresAt;
  }

  /** Live entry or undefined; expired entries are removed on sight. */
  private live(key: K): Entry<K, V> | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (this.isStale(e)) { this.remove(e, 'expire'); return undefined; }
    return e;
  }

  get(key: K): V | undefined {
    const e = this.live(key);
    if (!e) return undefined;
    if (this.head !== e) { this.unlink(e); this.pushFront(e); }
    return e.value;
  }

  peek(key: K): V | undefined {
    return this.live(key)?.value;
  }

  has(key: K): boolean {
    return this.live(key) !== undefined;
  }

  set(key: K, value: V, options: { ttl?: number } = {}): this {
    const ttl = options.ttl ?? this.opts.ttl ?? 0;
    const expiresAt = ttl > 0 ? this.clock.now() + ttl : Infinity;
    const size = this.opts.sizeOf ? this.opts.sizeOf(value, key) : 1;
    if (!(typeof size === 'number' && size > 0 && Number.isFinite(size))) {
      throw new TypeError(`sizeOf must return a positive number, got ${String(size)}`);
    }
    const existing = this.live(key);

    if (this.opts.maxSize !== undefined && size > this.opts.maxSize) {
      if (existing) this.remove(existing, 'delete');
      return this;
    }

    if (existing) {
      const old = existing.value;
      this.totalSize += size - existing.size;
      existing.value = value;
      existing.size = size;
      existing.expiresAt = expiresAt;
      if (this.head !== existing) { this.unlink(existing); this.pushFront(existing); }
      if (!Object.is(old, value)) this.opts.onEvict?.(key, old, 'overwrite');
    } else {
      const e: Entry<K, V> = { key, value, size, expiresAt, prev: null, next: null };
      this.map.set(key, e);
      this.pushFront(e);
      this.totalSize += size;
    }
    this.enforceLimits();
    return this;
  }

  private enforceLimits() {
    const maxSize = this.opts.maxSize ?? Infinity;
    while (this.tail && this.tail !== this.head && (this.map.size > this.opts.max || this.totalSize > maxSize)) {
      // The LRU entry may already be expired; report it as such.
      const t = this.tail;
      this.remove(t, this.isStale(t) ? 'expire' : 'evict');
    }
  }

  delete(key: K): boolean {
    const e = this.live(key);
    if (!e) return false;
    this.remove(e, 'delete');
    return true;
  }

  clear(): void {
    for (let e = this.head; e; ) {
      const next = e.next;
      this.remove(e, this.isStale(e) ? 'expire' : 'delete');
      e = next;
    }
  }

  get size(): number {
    this.purgeStale();
    return this.map.size;
  }

  keys(): K[] {
    this.purgeStale();
    const out: K[] = [];
    for (let e = this.head; e; e = e.next) out.push(e.key);
    return out;
  }

  purgeStale(): number {
    let n = 0;
    for (let e = this.head; e; ) {
      const next = e.next;
      if (this.isStale(e)) { this.remove(e, 'expire'); n++; }
      e = next;
    }
    return n;
  }
}
