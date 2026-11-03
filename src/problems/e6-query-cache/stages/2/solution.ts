import type { QueryKey, QueryFn, QueryState, QueryClientOptions, QueryClient } from './types';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype;

export function hashKey(key: QueryKey): string {
  return JSON.stringify(key, (_, value) => {
    if (!isPlainObject(value)) return value;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) sorted[k] = value[k];
    return sorted;
  });
}

interface Entry {
  data: unknown;
  hasData: boolean;
  error: unknown;
  status: QueryState<unknown>['status'];
  updatedAt: number;
  inflight: Promise<unknown> | null;
}

export function createQueryClient(options: QueryClientOptions = {}): QueryClient {
  const { staleTime = 0, clock = { now: () => Date.now() } } = options;
  const cache = new Map<string, Entry>();

  const isStale = (e: Entry) => !e.hasData || clock.now() - e.updatedAt >= staleTime;

  const entryFor = (key: QueryKey): Entry => {
    const h = hashKey(key);
    let e = cache.get(h);
    if (!e) {
      e = { data: undefined, hasData: false, error: undefined, status: 'pending', updatedAt: 0, inflight: null };
      cache.set(h, e);
    }
    return e;
  };

  const startFetch = (e: Entry, key: QueryKey, fn: QueryFn<unknown>): Promise<unknown> => {
    const signal = new AbortController().signal;
    const p = (async () => {
      try {
        const data = await fn({ queryKey: key, signal });
        e.data = data;
        e.hasData = true;
        e.status = 'success';
        e.error = undefined;
        e.updatedAt = clock.now();
        return data;
      } catch (err) {
        e.status = 'error';
        e.error = err;
        throw err;
      } finally {
        e.inflight = null;
      }
    })();
    e.inflight = p;
    return p;
  };

  return {
    fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T> {
      const e = entryFor(key);
      if (e.inflight) return e.inflight as Promise<T>;
      if (!isStale(e)) return Promise.resolve(e.data as T);
      return startFetch(e, key, fn as QueryFn<unknown>) as Promise<T>;
    },

    setQueryData<T>(key: QueryKey, updater: T | ((old: T | undefined) => T)): void {
      const e = entryFor(key);
      e.data = typeof updater === 'function' ? (updater as (old: T | undefined) => T)(e.data as T | undefined) : updater;
      e.hasData = true;
      e.status = 'success';
      e.error = undefined;
      e.updatedAt = clock.now();
    },

    getQueryData<T>(key: QueryKey): T | undefined {
      return cache.get(hashKey(key))?.data as T | undefined;
    },

    getState<T>(key: QueryKey): QueryState<T> | undefined {
      const e = cache.get(hashKey(key));
      if (!e) return undefined;
      return {
        status: e.status,
        fetchStatus: e.inflight ? 'fetching' : 'idle',
        data: e.data as T | undefined,
        error: e.error,
        updatedAt: e.updatedAt,
        isStale: isStale(e),
      };
    },
  };
}
