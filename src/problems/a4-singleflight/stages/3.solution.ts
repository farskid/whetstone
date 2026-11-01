export interface GroupOptions {
  ttl?: number;
  clock?: { now(): number };
}

interface Cached<T> { value: T; at: number }

export class Group<T> {
  private inflight = new Map<string, Promise<T>>();
  private cache = new Map<string, Cached<T>>();
  private generation = new Map<string, number>();
  private ttl?: number;
  private clock: { now(): number };

  constructor(options: GroupOptions = {}) {
    this.ttl = options.ttl;
    this.clock = options.clock ?? Date;
  }

  do(key: string | number, fn: () => T | Promise<T>): Promise<T> {
    const k = String(key);
    const cached = this.cache.get(k);
    if (cached && this.ttl !== undefined) {
      if (this.clock.now() - cached.at < this.ttl) return Promise.resolve(cached.value);
      this.cache.delete(k);
    }
    return this.inflight.get(k) ?? this.start(k, fn);
  }

  forget(key: string | number): void {
    const k = String(key);
    this.cache.delete(k);
    this.inflight.delete(k);
    this.generation.set(k, (this.generation.get(k) ?? 0) + 1);
  }

  private start(k: string, fn: () => T | Promise<T>): Promise<T> {
    const gen = this.generation.get(k) ?? 0;
    const current = () => (this.generation.get(k) ?? 0) === gen;
    let p: Promise<T>;
    try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
    const tracked = p.then(
      (value) => {
        if (current()) {
          this.inflight.delete(k);
          if (this.ttl !== undefined) this.cache.set(k, { value, at: this.clock.now() });
        }
        return value;
      },
      (error) => {
        if (current()) this.inflight.delete(k);
        throw error;
      },
    );
    this.inflight.set(k, tracked);
    return tracked;
  }
}
