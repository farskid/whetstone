import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Ring buffer';
const G2 = 'Percentiles and min/max';
const G3 = 'Time window';
const G4 = 'Histogram window';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'keeps the last N values, oldest first',
    run({ RollingWindow }, { expect }) {
      const w = new RollingWindow(3);
      [1, 2, 3, 4, 5].forEach((x) => w.push(x));
      expect(w.toArray()).toEqual([3, 4, 5]);
      expect(w.count()).toBe(3);
      expect(w.avg()).toBe(4);
    },
  },
  {
    group: G1,
    title: 'a window that is not full yet',
    run({ RollingWindow }, { expect }) {
      const w = new RollingWindow(10);
      w.push(2); w.push(4);
      expect([w.toArray(), w.count(), w.avg()]).toEqual([[2, 4], 2, 3]);
    },
  },
  {
    group: G1,
    title: 'empty window returns undefined; NaN is rejected',
    run({ RollingWindow }, { expect }) {
      const w = new RollingWindow(3);
      expect([w.avg(), w.min(), w.max(), w.percentile(50), w.count()]).toEqual([undefined, undefined, undefined, undefined, 0]);
      expect(() => w.push(NaN)).toThrow();
      let err: unknown; try { w.push(NaN); } catch (e) { err = e; }
      expect(err instanceof RangeError, 'RangeError').toBe(true);
      expect(w.count(), 'NaN not stored').toBe(0);
    },
  },
  {
    group: G2,
    title: 'percentile uses nearest rank',
    input: 'values 1..10',
    run({ RollingWindow }, { expect }) {
      const w = new RollingWindow(10);
      [7, 3, 10, 1, 5, 9, 2, 8, 4, 6].forEach((x) => w.push(x));
      expect([0, 10, 25, 50, 90, 95, 100].map((p) => w.percentile(p))).toEqual([1, 1, 3, 5, 9, 10, 10]);
      expect(() => w.percentile(101)).toThrow();
    },
  },
  {
    group: G2,
    title: 'min and max follow the window as values leave',
    run({ RollingWindow }, { expect }) {
      const w = new RollingWindow(3);
      const seen: [number | undefined, number | undefined][] = [];
      for (const x of [5, 1, 4, 6, 2, 3, 9]) { w.push(x); seen.push([w.min(), w.max()]); }
      expect(seen).toEqual([[5, 5], [1, 5], [1, 5], [1, 6], [2, 6], [2, 6], [2, 9]]);
    },
  },
  {
    group: G2,
    title: 'perf: 200k pushes into a 50k window with min/max after each',
    run({ RollingWindow }, { expect }) {
      const w = new RollingWindow(50_000);
      let seed = 1, acc = 0;
      const t0 = performance.now();
      let i = 0;
      for (; i < 200_000; i++) {
        seed = (seed * 16807) % 2147483647;
        w.push(seed % 1000);
        acc += w.min()! + w.max()!;
        if ((i & 1023) === 0 && performance.now() - t0 > 800) break; // bail out early on a slow solution
      }
      expect(i, 'pushes finished within 800 ms').toBe(200_000);
      expect(acc, 'sanity').toBeGreaterThan(0);
      expect(performance.now() - t0, 'ms').toBeLessThan(800);
    },
  },
  {
    group: G3,
    title: 'time window drops samples exactly windowMs old',
    input: 'windowMs 1000; push 1 at t=0, 2 at t=500',
    run({ TimeWindow }, { expect, clock }) {
      const c = clock();
      const w = new TimeWindow({ windowMs: 1000, clock: c });
      w.push(1); c.tick(500); w.push(2);
      c.tick(499);
      expect(w.toArray(), 'at 999').toEqual([1, 2]);
      c.tick(1);
      expect(w.toArray(), 'at 1000').toEqual([2]);
      expect([w.avg(), w.min(), w.max(), w.percentile(50)]).toEqual([2, 2, 2, 2]);
    },
  },
  {
    group: G3,
    title: 'clock jumping past the whole window empties it',
    run({ TimeWindow }, { expect, clock }) {
      const c = clock();
      const w = new TimeWindow({ windowMs: 60_000, clock: c });
      for (let i = 0; i < 100; i++) { w.push(i); c.tick(10); }
      c.tick(3_600_000);
      expect([w.count(), w.avg(), w.max()]).toEqual([0, undefined, undefined]);
      w.push(42);
      expect([w.count(), w.min(), w.max()]).toEqual([1, 42, 42]);
    },
  },
  {
    group: G3,
    title: 'time window min/max/percentile over many samples',
    run({ TimeWindow }, { expect, clock }) {
      const c = clock();
      const w = new TimeWindow({ windowMs: 100, clock: c });
      for (let i = 1; i <= 300; i++) { w.push(i); c.tick(1); }
      // now = 300; samples pushed at t >= 201 remain: values 202..300
      expect([w.count(), w.min(), w.max(), w.percentile(50)]).toEqual([99, 202, 300, 251]);
    },
  },
  {
    group: G4,
    title: 'histogram percentile returns the bucket upper bound',
    input: 'buckets [10, 50, 100, 500]',
    run({ HistogramWindow }, { expect, clock }) {
      const c = clock();
      const h = new HistogramWindow({ windowMs: 10_000, sliceMs: 1000, buckets: [10, 50, 100, 500], clock: c });
      for (const x of [5, 10, 20, 30, 40, 60, 70, 80, 90, 1000]) h.push(x);
      expect(h.count()).toBe(10);
      expect([h.percentile(0), h.percentile(20), h.percentile(50), h.percentile(90), h.percentile(100)]).toEqual([10, 10, 50, 100, Infinity]);
    },
  },
  {
    group: G4,
    title: 'old slices fall out of the window',
    input: 'windowMs 3000, sliceMs 1000',
    run({ HistogramWindow }, { expect, clock }) {
      const c = clock();
      const h = new HistogramWindow({ windowMs: 3000, sliceMs: 1000, buckets: [1, 2, 3], clock: c });
      h.push(1); c.tick(1000); h.push(2); h.push(2); c.tick(1000); h.push(3);
      expect(h.count(), 'at t=2000').toBe(4);
      c.tick(999);
      expect(h.count(), 'at t=2999').toBe(4);
      c.tick(1);
      expect(h.count(), 'at t=3000 (slice 0 dropped)').toBe(3);
      expect(h.percentile(0)).toBe(2);
      c.tick(10_000);
      expect([h.count(), h.percentile(50)]).toEqual([0, undefined]);
    },
  },
  {
    group: G4,
    title: 'perf: 1M pushes across many slices stay fast',
    run({ HistogramWindow }, { expect, clock }) {
      const c = clock();
      const h = new HistogramWindow({ windowMs: 60_000, sliceMs: 1000, buckets: [1, 5, 10, 50, 100, 500, 1000], clock: c });
      const t0 = performance.now();
      for (let i = 0; i < 1_000_000; i++) { if (i % 1000 === 0) c.tick(100); h.push(i % 700); }
      // now = 100 000 ms, slice 100; slices 41..100 are live = 591 blocks of 1000 pushes
      expect(h.count(), 'live slices only').toBe(591_000);
      expect(h.percentile(50)).toBe(500);
      expect(performance.now() - t0, 'ms').toBeLessThan(1500);
    },
  },
];
