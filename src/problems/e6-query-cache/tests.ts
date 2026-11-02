import type { TestCase, Deferred } from '../../runner/types';
type M = typeof import('./solution');
import type { QueryFn } from './types';

/** A query function whose calls you resolve by hand. */
function manualFn<T>(deferred: <X>() => Deferred<X>) {
  const calls: { d: Deferred<T>; signal: AbortSignal; key: readonly unknown[] }[] = [];
  const fn: QueryFn<T> = ({ signal, queryKey }) => {
    const d = deferred<T>();
    calls.push({ d, signal, key: queryKey });
    return d.promise;
  };
  return { fn, calls };
}

const counting = <T>(make: (n: number) => T) => {
  let n = 0;
  const fn: QueryFn<T> = async () => make(++n);
  return { fn, count: () => n };
};

const G1 = 'Keyed cache and dedupe';
const G2 = 'Staleness and setQueryData';
const G3 = 'Observers and invalidation';
const G4 = 'Retries and garbage collection';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'hashKey sorts object keys at every depth',
    run({ hashKey }, { expect }) {
      expect(hashKey(['todos', { a: 1, b: { y: 2, x: 1 } }])).toBe(hashKey(['todos', { b: { x: 1, y: 2 }, a: 1 }]));
      expect(hashKey(['todos', 1]) === hashKey(['todos', '1']), 'number vs string').toBe(false);
      expect(hashKey(['a', ['b', 'c']]) === hashKey(['a', 'b', 'c']), 'nesting matters').toBe(false);
      expect(hashKey(['x', [2, 1]]) === hashKey(['x', [1, 2]]), 'arrays keep order').toBe(false);
    },
  },
  {
    group: G1,
    title: 'fetchQuery caches by key and resolves data',
    async run({ createQueryClient }, { expect, clock }) {
      const c = createQueryClient({ staleTime: 1000, clock: clock() });
      const { fn, count } = counting((n) => `todos#${n}`);
      expect(await c.fetchQuery(['todos'], fn)).toBe('todos#1');
      expect(await c.fetchQuery(['todos'], fn), 'fresh: from cache').toBe('todos#1');
      expect(count()).toBe(1);
      expect(c.getQueryData(['todos'])).toBe('todos#1');
      expect(c.getState(['nope'])).toBeUndefined();
    },
  },
  {
    group: G1,
    title: 'concurrent fetches of the same key are deduped',
    async run({ createQueryClient }, { expect, deferred, clock }) {
      const c = createQueryClient({ clock: clock() });
      const m = manualFn<number>(deferred);
      const p1 = c.fetchQuery(['user', { id: 1, v: 2 }], m.fn);
      const p2 = c.fetchQuery(['user', { v: 2, id: 1 }], m.fn);
      expect(m.calls.length).toBe(1);
      expect(c.getState(['user', { id: 1, v: 2 }])).toEqual({
        status: 'pending', fetchStatus: 'fetching', data: undefined, error: undefined, updatedAt: 0, isStale: true,
      });
      m.calls[0].d.resolve(42);
      expect([await p1, await p2]).toEqual([42, 42]);
    },
  },
  {
    group: G2,
    title: 'staleTime: fresh data is served, stale data is refetched',
    input: 'staleTime 1000; fetch at t=0, t=999, t=1000',
    async run({ createQueryClient }, { expect, clock }) {
      const clk = clock();
      const c = createQueryClient({ staleTime: 1000, clock: clk });
      const { fn, count } = counting((n) => n);
      await c.fetchQuery(['k'], fn);
      clk.tick(999);
      expect(c.getState(['k'])!.isStale).toBe(false);
      expect(await c.fetchQuery(['k'], fn)).toBe(1);
      clk.tick(1);
      expect(c.getState(['k'])!.isStale).toBe(true);
      expect(await c.fetchQuery(['k'], fn)).toBe(2);
      expect(c.getState(['k'])!.updatedAt).toBe(1000);
      expect(count()).toBe(2);
    },
  },
  {
    group: G2,
    title: 'default staleTime 0 refetches every time',
    async run({ createQueryClient }, { expect, clock }) {
      const c = createQueryClient({ clock: clock() });
      const { fn, count } = counting((n) => n);
      await c.fetchQuery(['k'], fn);
      await c.fetchQuery(['k'], fn);
      expect(count()).toBe(2);
    },
  },
  {
    group: G2,
    title: 'setQueryData seeds the cache and clears an error',
    async run({ createQueryClient }, { expect, clock }) {
      const clk = clock(500);
      const c = createQueryClient({ staleTime: 100, clock: clk });
      await c.fetchQuery(['k'], async () => { throw new Error('x'); }).catch(() => {});
      c.setQueryData(['k'], { id: 1 });
      const s = c.getState(['k'])!;
      expect([s.status, s.error, s.updatedAt, s.isStale]).toEqual(['success', undefined, 500, false]);
      let called = false;
      expect(await c.fetchQuery(['k'], async () => { called = true; return null; })).toEqual({ id: 1 });
      expect(called).toBe(false);
    },
  },
  {
    group: G3,
    title: 'watch fetches, then notifies on every state change',
    async run({ createQueryClient }, { expect, deferred, clock, flush }) {
      const c = createQueryClient({ staleTime: 5000, clock: clock() });
      const m = manualFn<string>(deferred);
      const seen: string[] = [];
      c.watch(['todos'], m.fn, (s) => seen.push(`${s.status}/${s.fetchStatus}/${s.data ?? '-'}`));
      expect(m.calls.length).toBe(1);
      expect(seen, 'never synchronously inside watch()').toEqual([]);
      m.calls[0].d.resolve('A');
      await flush();
      expect(seen).toEqual(['success/idle/A']);
      c.setQueryData<string>(['todos'], (old) => old + 'B');
      expect(seen).toEqual(['success/idle/A', 'success/idle/AB']);
    },
  },
  {
    group: G3,
    title: 'watch on fresh cached data does not refetch',
    async run({ createQueryClient }, { expect, clock }) {
      const c = createQueryClient({ staleTime: 5000, clock: clock() });
      const { fn, count } = counting((n) => n);
      await c.fetchQuery(['k'], fn);
      const stop = c.watch(['k'], fn, () => {});
      expect(count()).toBe(1);
      stop();
    },
  },
  {
    group: G3,
    title: 'invalidateQueries matches by prefix and refetches only observed queries',
    async run({ createQueryClient }, { expect, clock }) {
      const c = createQueryClient({ staleTime: Infinity, clock: clock() });
      const a = counting((n) => `a${n}`);
      const b = counting((n) => `b${n}`);
      const other = counting((n) => `o${n}`);
      const stopA = c.watch(['todos', { page: 1 }], a.fn, () => {});
      await c.fetchQuery(['todos', { page: 2 }], b.fn);
      c.watch(['todosX'], other.fn, () => {});
      await c.invalidateQueries([]); // warm-up: everything
      const before = [a.count(), b.count(), other.count()];
      await c.invalidateQueries(['todos']);
      expect([a.count() - before[0], b.count() - before[1], other.count() - before[2]], 'only the observed todos query refetches').toEqual([1, 0, 0]);
      expect(c.getState(['todos', { page: 2 }])!.isStale, 'unobserved match is marked stale').toBe(true);
      expect(c.getState(['todosX'])!.isStale, '"todosX" is not under prefix ["todos"]').toBe(false);
      expect(await c.fetchQuery(['todos', { page: 2 }], b.fn), 'stale → refetch on next fetch').toBe(`b${b.count()}`);
      stopA();
    },
  },
  {
    group: G3,
    title: 'invalidation aborts the in-flight fetch; the stale response is ignored',
    input: 'fetch #1 in flight → invalidate → fetch #2 resolves, then #1 resolves late',
    async run({ createQueryClient }, { expect, deferred, clock, flush }) {
      const c = createQueryClient({ clock: clock() });
      const m = manualFn<string>(deferred);
      c.watch(['k'], m.fn, () => {});
      const waiting = c.fetchQuery(['k'], m.fn);
      const inv = c.invalidateQueries(['k']);
      expect(m.calls.length).toBe(2);
      expect(m.calls[0].signal.aborted, 'old fetch aborted').toBe(true);
      m.calls[1].d.resolve('new');
      await inv;
      m.calls[0].d.resolve('old (late)');
      await flush();
      expect(c.getQueryData(['k'])).toBe('new');
      expect(await waiting, 'the earlier caller gets the newest outcome').toBe('new');
    },
  },
  {
    group: G3,
    title: 'invalidating while a fetch is in flight keeps the result stale',
    input: 'unobserved fetch in flight, invalidate, then it resolves',
    async run({ createQueryClient }, { expect, deferred, clock }) {
      const c = createQueryClient({ staleTime: Infinity, clock: clock() });
      const m = manualFn<number>(deferred);
      const p = c.fetchQuery(['k'], m.fn);
      await c.invalidateQueries(['k']);
      m.calls[0].d.resolve(1);
      await p;
      expect(c.getState(['k'])!.isStale, 'data may predate the invalidation').toBe(true);
    },
  },
  {
    group: G4,
    title: 'retries with backoff on the clock, then succeeds',
    input: 'retry 2, default delays 1000ms then 2000ms',
    async run({ createQueryClient }, { expect, clock, flush }) {
      const clk = clock();
      const c = createQueryClient({ retry: 2, clock: clk });
      let calls = 0;
      const p = c.fetchQuery(['k'], async () => { calls++; if (calls < 3) throw new Error(`fail ${calls}`); return 'ok'; });
      await flush();
      expect(calls).toBe(1);
      await clk.advance(999);
      expect(calls).toBe(1);
      expect(c.getState(['k'])!.fetchStatus).toBe('fetching');
      await clk.advance(1);
      expect(calls).toBe(2);
      await clk.advance(1999);
      expect(calls).toBe(2);
      await clk.advance(1);
      expect(await p).toBe('ok');
      expect(calls).toBe(3);
    },
  },
  {
    group: G4,
    title: 'final failure: status error, old data kept, promise rejects',
    async run({ createQueryClient }, { expect, clock }) {
      const clk = clock();
      const c = createQueryClient({ retry: 1, retryDelay: () => 10, clock: clk });
      await c.fetchQuery(['k'], async () => 'old');
      const boom = new Error('down');
      const p = c.fetchQuery(['k'], async () => { throw boom; });
      const settled = p.then(() => 'resolved', (e) => e);
      await clk.advance(10);
      expect(await settled).toBe(boom);
      const s = c.getState(['k'])!;
      expect([s.status, s.fetchStatus, s.data, s.error]).toEqual(['error', 'idle', 'old', boom]);
    },
  },
  {
    group: G4,
    title: 'garbage collection after the last observer leaves',
    input: 'gcTime 1000',
    async run({ createQueryClient }, { expect, clock, flush }) {
      const clk = clock();
      const c = createQueryClient({ gcTime: 1000, staleTime: Infinity, clock: clk });
      const stop1 = c.watch(['k'], async () => 'v', () => {});
      const stop2 = c.watch(['k'], async () => 'v', () => {});
      await flush();
      stop1();
      clk.tick(5000);
      expect(c.getQueryData(['k']), 'still observed').toBe('v');
      stop2();
      clk.tick(999);
      const stop3 = c.watch(['k'], async () => 'v2', () => {});
      clk.tick(5000);
      expect(c.getQueryData(['k']), 'a new observer cancels the GC timer').toBe('v');
      stop3();
      stop3(); // idempotent
      clk.tick(1000);
      expect(c.getState(['k'])).toBeUndefined();
    },
  },
  {
    group: G4,
    title: 'unobserved fetchQuery results are collected too, but not mid-fetch',
    async run({ createQueryClient }, { expect, clock, deferred }) {
      const clk = clock();
      const c = createQueryClient({ gcTime: 100, clock: clk });
      const m = manualFn<number>(deferred);
      const p = c.fetchQuery(['k'], m.fn);
      clk.tick(10_000);
      expect(c.getState(['k'])?.fetchStatus, 'never collected while fetching').toBe('fetching');
      m.calls[0].d.resolve(1);
      await p;
      clk.tick(99);
      expect(c.getQueryData(['k'])).toBe(1);
      clk.tick(1);
      expect(c.getState(['k'])).toBeUndefined();
    },
  },
];
