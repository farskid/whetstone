import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Ordered results with a cap';
const G2 = 'Lazy input and pMapSkip';
const G3 = 'Errors';
const G4 = 'Abort';

/** Mapper that resolves item*10 after `delays[item]` ms on the fake clock, tracking peak concurrency and start order. */
function tracked(c: { setTimeout(fn: () => void, ms: number): unknown }, delays: Record<number, number>) {
  const stats = { running: 0, peak: 0, started: [] as number[] };
  const mapper = (item: number) => new Promise<number>((resolve) => {
    stats.running++; stats.peak = Math.max(stats.peak, stats.running); stats.started.push(item);
    c.setTimeout(() => { stats.running--; resolve(item * 10); }, delays[item] ?? 10);
  });
  return { mapper, stats };
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'results are in input order even when calls finish out of order',
    input: 'items [1,2,3,4]; delays 40,10,30,20; concurrency 2',
    async run({ pMap }, { expect, clock }) {
      const c = clock();
      const t = tracked(c, { 1: 40, 2: 10, 3: 30, 4: 20 });
      const p = pMap([1, 2, 3, 4], t.mapper, { concurrency: 2 });
      await c.runAll();
      expect(await p).toEqual([10, 20, 30, 40]);
    },
  },
  {
    group: G1,
    title: 'never more than `concurrency` calls at once, and a freed slot is reused right away',
    input: '10 items, concurrency 3',
    async run({ pMap }, { expect, clock }) {
      const c = clock();
      const t = tracked(c, { 0: 50 });
      const p = pMap([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], t.mapper, { concurrency: 3 });
      await c.advance(10);
      expect(t.stats.started.length, 'started after the first two finished').toBe(5);
      await c.runAll();
      await p;
      expect(t.stats.peak, 'peak in flight').toBe(3);
    },
  },
  {
    group: G1,
    title: 'mapper gets (item, index); promise items are awaited first',
    async run({ pMap }, { expect }) {
      const seen: unknown[] = [];
      const out = await pMap(['a', Promise.resolve('b'), 'c'], (item, i) => { seen.push([item, i]); return `${i}:${item}`; });
      expect(out).toEqual(['0:a', '1:b', '2:c']);
      expect(seen).toEqual([['a', 0], ['b', 1], ['c', 2]]);
    },
  },
  {
    group: G1,
    title: 'empty input resolves []',
    async run({ pMap }, { expect }) {
      expect(await pMap([], () => 1)).toEqual([]);
      expect(await pMap(new Set<number>(), () => 1, { concurrency: 2 })).toEqual([]);
    },
  },
  {
    group: G1,
    title: 'invalid concurrency throws a TypeError synchronously',
    run({ pMap }, { expect }) {
      for (const bad of [0, -1, 1.5, NaN]) {
        expect(() => pMap([1], (x) => x, { concurrency: bad }), String(bad)).toThrow();
        try { pMap([1], (x) => x, { concurrency: bad }); } catch (e) { expect(e instanceof TypeError, `${bad} is a TypeError`).toBe(true); }
      }
    },
  },
  {
    group: G2,
    title: 'pulls from the iterator only as slots free up',
    input: 'infinite generator, concurrency 2',
    async run({ pMap }, { expect, clock }) {
      const c = clock();
      let pulled = 0;
      function* naturals() { for (let i = 0; ; i++) { pulled++; yield i; } }
      const ac = new AbortController();
      const p = pMap(naturals(), (i) => new Promise<number>((r) => c.setTimeout(() => r(i), 10)), { concurrency: 2, signal: ac.signal });
      p.catch(() => {});
      await c.advance(0);
      expect(pulled, 'pulled before any finished').toBeLessThanOrEqual(3);
      await c.advance(10);
      expect(pulled, 'pulled after two finished').toBeLessThanOrEqual(5);
      ac.abort('enough');
      await expect(p).toReject((e) => e === 'enough');
    },
  },
  {
    group: G2,
    title: 'async iterables work',
    async run({ pMap }, { expect }) {
      async function* gen() { yield 1; yield 2; yield 3; }
      expect(await pMap(gen(), async (x) => x * 2, { concurrency: 2 })).toEqual([2, 4, 6]);
    },
  },
  {
    group: G2,
    title: 'pMapSkip leaves items out of the result',
    async run({ pMap, pMapSkip }, { expect }) {
      const out = await pMap([1, 2, 3, 4, 5], async (x) => (x % 2 === 0 ? pMapSkip : x), { concurrency: 2 });
      expect(out).toEqual([1, 3, 5]);
    },
  },
  {
    group: G2,
    title: 'an iterator that throws rejects the result',
    async run({ pMap }, { expect }) {
      function* bad() { yield 1; throw new Error('iterator broke'); }
      await expect(pMap(bad(), (x) => x, { concurrency: 1 })).toReject('iterator broke');
    },
  },
  {
    group: G3,
    title: 'stopOnError: rejects with the first error and starts nothing new',
    input: 'items 0..9, concurrency 2, item 1 fails at 5 ms',
    async run({ pMap }, { expect, clock }) {
      const c = clock();
      const started: number[] = [];
      const p = pMap([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], (i) => new Promise<number>((res, rej) => {
        started.push(i);
        c.setTimeout(() => (i === 1 ? rej(new Error('item 1 failed')) : res(i)), i === 1 ? 5 : 10);
      }), { concurrency: 2 });
      p.catch(() => {});
      await c.advance(5);
      await expect(p).toReject('item 1 failed');
      await c.runAll();
      expect(started, 'calls started').toEqual([0, 1]);
    },
  },
  {
    group: G3,
    title: 'stopOnError false: runs everything, then AggregateError in input order',
    input: 'items 0..4; 1 fails at 30 ms, 3 fails at 10 ms',
    async run({ pMap }, { expect, clock }) {
      const c = clock();
      const started: number[] = [];
      const p = pMap([0, 1, 2, 3, 4], (i) => new Promise<number>((res, rej) => {
        started.push(i);
        c.setTimeout(() => (i === 1 || i === 3 ? rej(new Error(`e${i}`)) : res(i)), i === 1 ? 30 : 10);
      }), { concurrency: 5, stopOnError: false });
      p.catch(() => {});
      await c.runAll();
      await expect(p).toReject((e) => e instanceof AggregateError && (e as AggregateError).errors.map((x: Error) => x.message).join() === 'e1,e3');
      expect(started.length, 'all items ran').toBe(5);
    },
  },
  {
    group: G4,
    title: 'abort rejects with the reason and starts no new calls',
    async run({ pMap }, { expect, clock }) {
      const c = clock();
      const ac = new AbortController();
      const started: number[] = [];
      const p = pMap([1, 2, 3, 4, 5], (i) => new Promise<number>((r) => { started.push(i); c.setTimeout(() => r(i), 10); }), { concurrency: 2, signal: ac.signal });
      p.catch(() => {});
      await c.advance(5);
      ac.abort(new Error('stop'));
      await expect(p).toReject('stop');
      await c.runAll();
      expect(started).toEqual([1, 2]);
    },
  },
  {
    group: G4,
    title: 'an already-aborted signal never calls the mapper',
    async run({ pMap }, { expect }) {
      const ac = new AbortController(); ac.abort('nope');
      let calls = 0;
      await expect(pMap([1, 2], () => { calls++; return 1; }, { signal: ac.signal })).toReject((e) => e === 'nope');
      expect(calls).toBe(0);
    },
  },
];
