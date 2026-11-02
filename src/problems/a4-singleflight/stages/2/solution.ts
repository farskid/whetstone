import type { GroupOptions } from './types';

interface Cached<T> { value: T; at: number }

export class Group<T> {
  private inflight = new Map<string, Promise<T>>();
  private cache = new Map<string, Cached<T>>();
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
    const existing = this.inflight.get(k);
    if (existing) return existing;
    let p: Promise<T>;
    try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
    const tracked = p.then(
      (value) => {
        this.inflight.delete(k);
        if (this.ttl !== undefined) this.cache.set(k, { value, at: this.clock.now() });
        return value;
      },
      (error) => { this.inflight.delete(k); throw error; },
    );
    this.inflight.set(k, tracked);
    return tracked;
  }
}
