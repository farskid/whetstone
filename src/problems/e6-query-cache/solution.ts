import type { QueryKey, QueryFn, QueryState, QueryClientOptions } from './types';

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

interface Waiter { resolve(v: unknown): void; reject(e: unknown): void }

interface Entry {
  key: QueryKey;
  fn: QueryFn<unknown>;
  data: unknown;
  hasData: boolean;
  error: unknown;
  status: QueryState<unknown>['status'];
  updatedAt: number;
  invalidatedAt: number; // -1 = not invalidated
  observers: Set<(s: QueryState<unknown>) => void>;
  fetchId: number;
  controller: AbortController | null;
  waiters: Waiter[];
  gcTimer: number | undefined;
}

export function createQueryClient(options: QueryClientOptions = {}) {
  const {
    staleTime = 0,
    gcTime = 300_000,
    retry = 0,
    retryDelay = (n: number) => 1000 * 2 ** (n - 1),
    clock = { now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (id) => clearTimeout(id) },
  } = options;
  const cache = new Map<string, Entry>();
  let invalidationSeq = 0;

  const isStale = (e: Entry) =>
    !e.hasData || clock.now() - e.updatedAt >= staleTime || e.invalidatedAt >= 0;

  const stateOf = (e: Entry): QueryState<unknown> => ({
    status: e.status,
    fetchStatus: e.controller ? 'fetching' : 'idle',
    data: e.data,
    error: e.error,
    updatedAt: e.updatedAt,
    isStale: isStale(e),
  });

  const notify = (e: Entry) => {
    const s = stateOf(e);
    for (const l of [...e.observers]) l(s);
  };

  const cancelGc = (e: Entry) => {
    if (e.gcTimer !== undefined) { clock.clearTimeout(e.gcTimer); e.gcTimer = undefined; }
  };
  const maybeScheduleGc = (e: Entry) => {
    cancelGc(e);
    if (e.observers.size > 0 || e.controller) return;
    e.gcTimer = clock.setTimeout(() => {
      e.gcTimer = undefined;
      const h = hashKey(e.key);
      if (cache.get(h) === e && e.observers.size === 0 && !e.controller) cache.delete(h);
    }, gcTime);
  };

  const entryFor = (key: QueryKey, fn?: QueryFn<unknown>): Entry => {
    const h = hashKey(key);
    let e = cache.get(h);
    if (!e) {
      e = {
        key, fn: fn!, data: undefined, hasData: false, error: undefined, status: 'pending',
        updatedAt: 0, invalidatedAt: -1, observers: new Set(), fetchId: 0, controller: null, waiters: [], gcTimer: undefined,
      };
      cache.set(h, e);
    }
    if (fn) e.fn = fn;
    return e;
  };

  const sleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
      const id = clock.setTimeout(resolve, ms);
      signal.addEventListener('abort', () => { clock.clearTimeout(id); resolve(); }, { once: true });
    });

  /** Start (or restart) a fetch. Returns a promise for the outcome of this fetch cycle. */
  const startFetch = (e: Entry, supersede: boolean): Promise<unknown> => {
    cancelGc(e);
    const promise = new Promise<unknown>((resolve, reject) => e.waiters.push({ resolve, reject }));
    if (e.controller && !supersede) return promise;
    e.controller?.abort();
    const controller = new AbortController();
    e.controller = controller;
    const id = ++e.fetchId;
    const fetchStartedAt = invalidationSeq;
    notify(e);

    (async () => {
      let failures = 0;
      for (;;) {
        try {
          const data = await e.fn({ queryKey: e.key, signal: controller.signal });
          return { ok: true as const, data };
        } catch (err) {
          if (controller.signal.aborted || failures >= retry) return { ok: false as const, err };
          failures++;
          await sleep(retryDelay(failures), controller.signal);
          if (controller.signal.aborted) return { ok: false as const, err };
        }
      }
    })().then((outcome) => {
      if (e.fetchId !== id) return; // superseded: ignore
      e.controller = null;
      const waiters = e.waiters;
      e.waiters = [];
      if (outcome.ok) {
        e.data = outcome.data;
        e.hasData = true;
        e.status = 'success';
        e.error = undefined;
        e.updatedAt = clock.now();
        if (e.invalidatedAt <= fetchStartedAt) e.invalidatedAt = -1;
        waiters.forEach((w) => w.resolve(outcome.data));
      } else {
        e.status = 'error';
        e.error = outcome.err;
        waiters.forEach((w) => w.reject(outcome.err));
      }
      notify(e);
      maybeScheduleGc(e);
    });
    return promise;
  };

  return {
    fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T> {
      const e = entryFor(key, fn as QueryFn<unknown>);
      if (!e.controller && !isStale(e)) return Promise.resolve(e.data as T);
      return startFetch(e, false) as Promise<T>;
    },

    watch<T>(key: QueryKey, fn: QueryFn<T>, listener: (state: QueryState<T>) => void): () => void {
      const e = entryFor(key, fn as QueryFn<unknown>);
      const l = listener as (s: QueryState<unknown>) => void;
      cancelGc(e);
      // Start the fetch before registering, so the listener is never called synchronously inside watch().
      if (isStale(e) && !e.controller) startFetch(e, false).catch(() => {});
      e.observers.add(l);
      return () => {
        if (!e.observers.delete(l)) return;
        maybeScheduleGc(e);
      };
    },

    async invalidateQueries(prefix: QueryKey): Promise<void> {
      const prefixHashes = prefix.map((p) => hashKey([p]));
      const seq = ++invalidationSeq;
      const refetches: Promise<unknown>[] = [];
      for (const e of [...cache.values()]) {
        if (e.key.length < prefix.length) continue;
        if (!prefixHashes.every((h, i) => hashKey([e.key[i]]) === h)) continue;
        e.invalidatedAt = seq;
        if (e.observers.size > 0) refetches.push(startFetch(e, true).catch(() => {}));
        else notify(e);
      }
      await Promise.all(refetches);
    },

    setQueryData<T>(key: QueryKey, updater: T | ((old: T | undefined) => T)): void {
      const e = entryFor(key);
      const next = typeof updater === 'function' ? (updater as (old: T | undefined) => T)(e.data as T | undefined) : updater;
      e.data = next;
      e.hasData = true;
      e.status = 'success';
      e.error = undefined;
      e.updatedAt = clock.now();
      e.invalidatedAt = -1;
      notify(e);
      maybeScheduleGc(e);
    },

    getQueryData<T>(key: QueryKey): T | undefined {
      return cache.get(hashKey(key))?.data as T | undefined;
    },

    getState<T>(key: QueryKey): QueryState<T> | undefined {
      const e = cache.get(hashKey(key));
      return e ? (stateOf(e) as QueryState<T>) : undefined;
    },
  };
}
