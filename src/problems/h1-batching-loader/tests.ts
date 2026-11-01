import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

/** A batchFn that records its calls and returns `key * 10` (or an Error for keys in `bad`). */
function recorder<K = number>(value: (k: K) => unknown = (k) => (k as unknown as number) * 10) {
  const calls: K[][] = [];
  const fn = async (keys: readonly K[]) => {
    calls.push([...keys]);
    return keys.map(value) as any[];
  };
  return { calls, fn };
}

async function settle<T>(p: Promise<T>): Promise<string> {
  try { return 'ok ' + JSON.stringify(await p); } catch (e) { return 'err ' + (e as Error).message; }
}

export const tests: TestCase<M>[] = [
  {
    group: 'Batching',
    title: 'loads in the same synchronous run share one batch, in call order',
    async run({ Loader }, { expect, flush }) {
      const r = recorder();
      const l = new Loader<number, number>(r.fn);
      const ps = [l.load(3), l.load(1), l.load(2)];
      expect(r.calls, 'nothing is sent inside load()').toEqual([]);
      expect(await Promise.all(ps)).toEqual([30, 10, 20]);
      expect(r.calls).toEqual([[3, 1, 2]]);
      await flush();
      const later = l.load(4);
      expect(await later).toBe(40);
      expect(r.calls, 'a later run gets its own batch').toEqual([[3, 1, 2], [4]]);
    },
  },
  {
    group: 'Batching',
    title: 'results line up with keys, and load(null) throws right away',
    async run({ Loader }, { expect }) {
      const l = new Loader<string, string>(async (keys) => keys.map((k) => k.toUpperCase()));
      expect(await Promise.all([l.load('b'), l.load('a')])).toEqual(['B', 'A']);
      let err: unknown;
      try { l.load(null as unknown as string); } catch (e) { err = e; }
      expect(err).toBeInstanceOf(TypeError);
      expect(() => l.load(undefined as unknown as string)).toThrow(/key/);
    },
  },
  {
    group: 'Cache and errors',
    title: 'duplicate keys are deduped and later loads hit the cache',
    async run({ Loader }, { expect, flush }) {
      const r = recorder();
      const l = new Loader<number, number>(r.fn);
      const a = l.load(1);
      const b = l.load(1);
      expect(a === b, 'the same promise').toBe(true);
      l.load(2);
      await flush();
      expect(r.calls).toEqual([[1, 2]]);
      expect(await l.load(1)).toBe(10);
      await flush();
      expect(r.calls, 'served from the cache').toEqual([[1, 2]]);
    },
  },
  {
    group: 'Cache and errors',
    title: 'an Error value rejects only its key, and that key can be retried',
    async run({ Loader }, { expect, flush }) {
      let fail = true;
      const r = recorder<number>((k) => (k === 2 && fail ? new Error('no 2') : k * 10));
      const l = new Loader<number, number>(r.fn);
      const out = await Promise.all([settle(l.load(1)), settle(l.load(2)), settle(l.load(3))]);
      expect(out).toEqual(['ok 10', 'err no 2', 'ok 30']);
      fail = false;
      expect(await settle(l.load(2)), 'the error was not cached').toBe('ok 20');
      expect(await settle(l.load(1))).toBe('ok 10');
      await flush();
      expect(r.calls).toEqual([[1, 2, 3], [2]]);
    },
  },
  {
    group: 'Cache and errors',
    title: 'a rejected or throwing batchFn rejects the whole batch, and the keys can be retried',
    async run({ Loader }, { expect }) {
      let mode = 'reject';
      const calls: number[][] = [];
      const l = new Loader<number, number>((keys) => {
        calls.push([...keys]);
        if (mode === 'throw') throw new Error('sync boom');
        if (mode === 'reject') return Promise.reject(new Error('down'));
        return Promise.resolve(keys.map((k) => k + 1));
      });
      expect(await Promise.all([settle(l.load(1)), settle(l.load(2))])).toEqual(['err down', 'err down']);
      mode = 'throw';
      expect(await Promise.all([settle(l.load(1)), settle(l.load(5))])).toEqual(['err sync boom', 'err sync boom']);
      mode = 'ok';
      expect(await Promise.all([settle(l.load(1)), settle(l.load(2))])).toEqual(['ok 2', 'ok 3']);
      expect(calls).toEqual([[1, 2], [1, 5], [1, 2]]);
    },
  },
  {
    group: 'Cache and errors',
    title: 'a result of the wrong length rejects every key with a TypeError',
    async run({ Loader }, { expect }) {
      let short = true;
      const l = new Loader<number, number>(async (keys) => (short ? keys.slice(1).map((k) => k) : keys.map((k) => k)));
      const ps = [l.load(1), l.load(2)];
      const errs = await Promise.all(ps.map((p) => p.then(() => null, (e: unknown) => e)));
      expect(errs[0]).toBeInstanceOf(TypeError);
      expect(errs[1]).toBeInstanceOf(TypeError);
      short = false;
      expect(await l.load(1), 'not cached').toBe(1);
    },
  },
  {
    group: 'Scheduling',
    title: 'maxBatchSize splits a run into several calls, in order',
    async run({ Loader }, { expect }) {
      const r = recorder();
      const l = new Loader<number, number>(r.fn, { maxBatchSize: 2 });
      const out = await Promise.all([1, 2, 3, 4, 5].map((k) => l.load(k)));
      expect(out).toEqual([10, 20, 30, 40, 50]);
      expect(r.calls).toEqual([[1, 2], [3, 4], [5]]);
      const dup = await Promise.all([l.load(6), l.load(6), l.load(7), l.load(8)]);
      expect(dup).toEqual([60, 60, 70, 80]);
      expect(r.calls.slice(3), 'a deduped key does not take a slot').toEqual([[6, 7], [8]]);
      expect(() => new Loader(r.fn, { maxBatchSize: 0 })).toThrow(/maxBatchSize/);
    },
  },
  {
    group: 'Scheduling',
    title: 'batchScheduleFn can collect loads over a time window',
    async run({ Loader }, { expect, clock, flush }) {
      const c = clock();
      const r = recorder();
      const l = new Loader<number, number>(r.fn, { batchScheduleFn: (cb) => c.setTimeout(cb, 10) });
      const got: number[] = [];
      l.load(1).then((v) => got.push(v));
      await c.advance(5);
      l.load(2).then((v) => got.push(v));
      await flush();
      expect(r.calls, 'still collecting').toEqual([]);
      await c.advance(5);
      expect(r.calls).toEqual([[1, 2]]);
      expect(got).toEqual([10, 20]);
      l.load(3);
      expect(c.pendingTimers(), 'a new window starts with the next load').toBe(1);
      await c.advance(10);
      expect(r.calls).toEqual([[1, 2], [3]]);
    },
  },
  {
    group: 'Scheduling',
    title: 'cache: false sends every load, duplicates included',
    async run({ Loader }, { expect }) {
      const r = recorder();
      const l = new Loader<number, number>(r.fn, { cache: false });
      expect(await Promise.all([l.load(1), l.load(1)])).toEqual([10, 10]);
      expect(await l.load(1)).toBe(10);
      l.prime(9, 0);
      expect(await l.load(9), 'prime does nothing without a cache').toBe(90);
      expect(r.calls).toEqual([[1, 1], [1], [9]]);
    },
  },
  {
    group: 'Cache control',
    title: 'clear, clearAll and prime',
    async run({ Loader }, { expect }) {
      const r = recorder();
      const l = new Loader<number, number>(r.fn);
      await Promise.all([l.load(1), l.load(2)]);
      expect(l.clear(1), 'chainable').toBe(l);
      await Promise.all([l.load(1), l.load(2)]);
      expect(r.calls).toEqual([[1, 2], [1]]);
      l.prime(3, 333).prime(1, 111);
      expect(await Promise.all([l.load(3), l.load(1)]), 'prime does not overwrite').toEqual([333, 10]);
      l.clearAll();
      await Promise.all([l.load(1), l.load(3)]);
      expect(r.calls).toEqual([[1, 2], [1], [1, 3]]);
    },
  },
  {
    group: 'Cache control',
    title: 'cacheKeyFn lets object keys share a cache entry; loadMany never rejects',
    async run({ Loader }, { expect }) {
      const calls: unknown[][] = [];
      const l = new Loader<{ id: number }, string, number>(async (keys) => {
        calls.push([...keys]);
        return keys.map((k) => (k.id < 0 ? new Error(`bad ${k.id}`) : `user${k.id}`));
      }, { cacheKeyFn: (k) => k.id });
      const a = { id: 1 };
      const res = await l.loadMany([a, { id: 1 }, { id: -1 }, { id: 2 }]);
      expect(res.map((x) => (x instanceof Error ? `Error(${x.message})` : x))).toEqual(['user1', 'user1', 'Error(bad -1)', 'user2']);
      expect(calls, 'batchFn gets the original keys').toEqual([[a, { id: -1 }, { id: 2 }]]);
      l.clear({ id: 2 });
      await l.load({ id: 2 });
      expect(calls.length).toBe(2);
    },
  },
];
