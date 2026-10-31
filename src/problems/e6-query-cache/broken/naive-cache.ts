// Broken: a promise cache. Dedupes, but unsorted JSON keys, no abort on
// invalidation (late responses win), no retry, errors wipe data, no GC.
export type QueryKey = readonly unknown[];
export type QueryFn<T> = (ctx: { queryKey: QueryKey; signal: AbortSignal }) => Promise<T>;
export interface QueryState<T> {
  status: 'pending' | 'success' | 'error'; fetchStatus: 'fetching' | 'idle';
  data: T | undefined; error: unknown; updatedAt: number; isStale: boolean;
}
export const hashKey = (key: QueryKey) => JSON.stringify(key);

export function createQueryClient(options: { staleTime?: number; clock?: { now(): number } } = {}) {
  const staleTime = options.staleTime ?? 0;
  const now = () => (options.clock ?? Date).now();
  const cache = new Map<string, { key: QueryKey; st: QueryState<any>; inflight?: Promise<any>; fn?: QueryFn<any>; obs: Set<(s: any) => void> }>();
  const get = (key: QueryKey) => {
    const h = hashKey(key);
    if (!cache.has(h)) cache.set(h, { key, obs: new Set(), st: { status: 'pending', fetchStatus: 'idle', data: undefined, error: undefined, updatedAt: 0, isStale: true } });
    return cache.get(h)!;
  };
  const fresh = (e: ReturnType<typeof get>) => e.st.status === 'success' && now() - e.st.updatedAt < staleTime && !e.st.isStale;
  const run = (e: ReturnType<typeof get>) => {
    if (e.inflight) return e.inflight;
    e.st = { ...e.st, fetchStatus: 'fetching' };
    e.inflight = e.fn!({ queryKey: e.key, signal: new AbortController().signal }).then(
      (data) => { e.inflight = undefined; e.st = { status: 'success', fetchStatus: 'idle', data, error: undefined, updatedAt: now(), isStale: false }; e.obs.forEach((l) => l(e.st)); return data; },
      (error) => { e.inflight = undefined; e.st = { status: 'error', fetchStatus: 'idle', data: undefined, error, updatedAt: 0, isStale: true }; e.obs.forEach((l) => l(e.st)); throw error; },
    );
    return e.inflight;
  };
  return {
    fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T> {
      const e = get(key); e.fn = fn;
      return fresh(e) ? Promise.resolve(e.st.data) : run(e);
    },
    watch<T>(key: QueryKey, fn: QueryFn<T>, l: (s: QueryState<T>) => void) {
      const e = get(key); e.fn = fn; e.obs.add(l);
      if (!fresh(e)) run(e).catch(() => {});
      return () => { e.obs.delete(l); };
    },
    async invalidateQueries(prefix: QueryKey) {
      const p = hashKey(prefix).slice(0, -1);
      await Promise.all([...cache.entries()].filter(([h]) => h.startsWith(p)).map(([, e]) => {
        e.st = { ...e.st, isStale: true };
        return e.obs.size ? run(e).catch(() => {}) : undefined;
      }));
    },
    setQueryData<T>(key: QueryKey, u: T | ((o: T | undefined) => T)) {
      const e = get(key);
      const data = typeof u === 'function' ? (u as any)(e.st.data) : u;
      e.st = { status: 'success', fetchStatus: 'idle', data, error: undefined, updatedAt: now(), isStale: false };
      e.obs.forEach((l) => l(e.st));
    },
    getQueryData: <T>(key: QueryKey): T | undefined => cache.get(hashKey(key))?.st.data,
    getState: <T>(key: QueryKey): QueryState<T> | undefined => cache.get(hashKey(key))?.st,
  };
}
