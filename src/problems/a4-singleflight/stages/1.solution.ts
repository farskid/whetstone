export class Group<T> {
  private inflight = new Map<string, Promise<T>>();

  do(key: string | number, fn: () => T | Promise<T>): Promise<T> {
    const k = String(key);
    const existing = this.inflight.get(k);
    if (existing) return existing;
    let p: Promise<T>;
    try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
    const tracked = p.finally(() => this.inflight.delete(k));
    this.inflight.set(k, tracked);
    return tracked;
  }
}
