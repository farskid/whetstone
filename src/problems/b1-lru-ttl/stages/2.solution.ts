export interface Options {
  max: number;
  ttl?: number;
  clock?: { now(): number };
}

interface Entry<K, V> {
  key: K;
  value: V;
  expiresAt: number; // Infinity = never
  prev: Entry<K, V> | null; // towards most recent
  next: Entry<K, V> | null; // towards least recent
}

// A Map for O(1) lookup plus a doubly linked list for O(1) recency updates.
export class LRUCache<K, V> {
  private map = new Map<K, Entry<K, V>>();
  private head: Entry<K, V> | null = null; // most recent
  private tail: Entry<K, V> | null = null; // least recent
  private readonly opts: Options;
  private readonly clock: { now(): number };

  constructor(options: Options) {
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

  private remove(e: Entry<K, V>) {
    this.unlink(e);
    this.map.delete(e.key);
  }

  private isStale(e: Entry<K, V>) {
    return this.clock.now() >= e.expiresAt;
  }

  /** Live entry or undefined; expired entries are removed on sight. */
  private live(key: K): Entry<K, V> | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (this.isStale(e)) { this.remove(e); return undefined; }
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
    const existing = this.live(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      if (this.head !== existing) { this.unlink(existing); this.pushFront(existing); }
    } else {
      const e: Entry<K, V> = { key, value, expiresAt, prev: null, next: null };
      this.map.set(key, e);
      this.pushFront(e);
    }
    while (this.tail && this.map.size > this.opts.max) {
      const t = this.tail;
      this.remove(t);
    }
    return this;
  }

  delete(key: K): boolean {
    const e = this.live(key);
    if (!e) return false;
    this.remove(e);
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = this.tail = null;
  }

  get size(): number {
    this.dropStale();
    return this.map.size;
  }

  keys(): K[] {
    this.dropStale();
    const out: K[] = [];
    for (let e = this.head; e; e = e.next) out.push(e.key);
    return out;
  }

  private dropStale(): number {
    let n = 0;
    for (let e = this.head; e; ) {
      const next = e.next;
      if (this.isStale(e)) { this.remove(e); n++; }
      e = next;
    }
    return n;
  }
}
