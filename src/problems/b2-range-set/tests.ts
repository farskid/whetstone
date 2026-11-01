import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Add and merge';
const G2 = 'Remove and query';
const G3 = 'Free slots';
const G4 = 'Common availability';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'adds disjoint ranges and returns them sorted',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([20, 30]); s.add([0, 5]); s.add([10, 12]);
      expect(s.toArray()).toEqual([[0, 5], [10, 12], [20, 30]]);
    },
  },
  {
    group: G1,
    title: 'merges overlapping ranges, including one that spans many',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([0, 2]); s.add([4, 6]); s.add([8, 10]); s.add([20, 21]);
      s.add([1, 9]);
      expect(s.toArray()).toEqual([[0, 10], [20, 21]]);
    },
  },
  {
    group: G1,
    title: 'merges touching ranges [1,3) + [3,5)',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([1, 3]); s.add([3, 5]); s.add([0, 1]);
      expect(s.toArray()).toEqual([[0, 5]]);
    },
  },
  {
    group: G1,
    title: 'ignores zero-length and inverted ranges',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([5, 5]); s.add([9, 3]);
      expect(s.toArray()).toEqual([]);
    },
  },
  {
    group: G1,
    title: 'never mutates inputs or exposes internal arrays',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      const a: [number, number] = [0, 5], b: [number, number] = [3, 9];
      s.add(a); s.add(b);
      expect([a, b], 'inputs').toEqual([[0, 5], [3, 9]]);
      const out = s.toArray();
      out[0][1] = 100; out.push([200, 300]);
      expect(s.toArray(), 'after editing the result').toEqual([[0, 9]]);
    },
  },
  {
    group: G2,
    title: 'remove splits a range',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([0, 10]);
      s.remove([3, 5]);
      expect(s.toArray()).toEqual([[0, 3], [5, 10]]);
    },
  },
  {
    group: G2,
    title: 'remove across many ranges trims the ends',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      for (const r of [[0, 4], [6, 8], [10, 12], [14, 20]] as [number, number][]) s.add(r);
      s.remove([2, 16]);
      expect(s.toArray()).toEqual([[0, 2], [16, 20]]);
      s.remove([20, 25]); s.remove([-5, 0]);
      expect(s.toArray(), 'removing touching ranges changes nothing').toEqual([[0, 2], [16, 20]]);
    },
  },
  {
    group: G2,
    title: 'contains uses half-open bounds',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([10, 20]); s.add([30, 40]);
      expect([9, 10, 19.5, 20, 25, 30, 40].map((x) => s.contains(x))).toEqual([false, true, true, false, false, true, false]);
    },
  },
  {
    group: G2,
    title: 'overlaps: touching is not overlapping',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([10, 20]); s.add([30, 40]);
      expect(s.overlaps([0, 10]), '[0,10)').toBe(false);
      expect(s.overlaps([20, 30]), '[20,30)').toBe(false);
      expect(s.overlaps([19, 21]), '[19,21)').toBe(true);
      expect(s.overlaps([0, 100]), '[0,100)').toBe(true);
      expect(s.overlaps([25, 25]), 'empty').toBe(false);
    },
  },
  {
    group: G2,
    title: 'handles huge numbers',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      const big = Number.MAX_SAFE_INTEGER;
      s.add([big - 10, big]); s.add([-Infinity, -1e300]);
      expect(s.contains(big - 1)).toBe(true);
      expect(s.contains(-1e301)).toBe(true);
      expect(s.toArray()).toEqual([[-Infinity, -1e300], [big - 10, big]]);
    },
  },
  {
    group: G2,
    title: 'perf: 50k contains/overlaps over 20k ranges',
    async run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      for (let i = 0; i < 20_000; i++) s.add([i * 10, i * 10 + 5]);
      let hits = 0;
      const t0 = performance.now();
      for (let q = 0; q < 50_000; q++) {
        const x = (q * 7919) % 200_000;
        if (s.contains(x)) hits++;
        if (s.overlaps([x, x + 3])) hits++;
      }
      const ms = performance.now() - t0;
      expect(hits, 'sanity').toBeGreaterThan(0);
      expect(ms, 'ms for 100k queries').toBeLessThan(300);
    },
  },
  {
    group: G3,
    title: 'freeSlots returns gaps inside the window',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([9, 11]); s.add([14, 15]);
      expect(s.freeSlots([8, 18])).toEqual([[8, 9], [11, 14], [15, 18]]);
    },
  },
  {
    group: G3,
    title: 'freeSlots clips busy ranges that stick out of the window and filters by minDuration',
    run({ RangeSet }, { expect }) {
      const s = new RangeSet();
      s.add([0, 10]); s.add([12, 13]); s.add([17, 30]);
      expect(s.freeSlots([5, 20])).toEqual([[10, 12], [13, 17]]);
      expect(s.freeSlots([5, 20], 3), 'minDuration 3').toEqual([[13, 17]]);
      expect(s.freeSlots([0, 10]), 'fully busy').toEqual([]);
      expect(new RangeSet().freeSlots([1, 2]), 'empty set').toEqual([[1, 2]]);
    },
  },
  {
    group: G4,
    title: 'common free slots across people',
    input: 'Ann busy 9–10, 13–14; Bob busy 11–12; both work 9–17; window 8–18',
    run({ commonFreeSlots }, { expect }) {
      const out = commonFreeSlots([
        { busy: [[9, 10], [13, 14]], workingHours: [[9, 17]] },
        { busy: [[11, 12]], workingHours: [[9, 17]] },
      ], [8, 18]);
      expect(out).toEqual([[10, 11], [12, 13], [14, 17]]);
    },
  },
  {
    group: G4,
    title: 'working hours limit availability, including split days',
    input: 'Ann works 9–12 and 13–17; Bob works 10–15; minDuration 2',
    run({ commonFreeSlots }, { expect }) {
      const people = [
        { busy: [], workingHours: [[9, 12], [13, 17]] as [number, number][] },
        { busy: [[14, 14.5]] as [number, number][], workingHours: [[10, 15]] as [number, number][] },
      ];
      expect(commonFreeSlots(people, [0, 24])).toEqual([[10, 12], [13, 14], [14.5, 15]]);
      expect(commonFreeSlots(people, [0, 24], 2), 'minDuration 2').toEqual([[10, 12]]);
    },
  },
  {
    group: G4,
    title: 'no people means the whole window is free; inputs untouched',
    run({ commonFreeSlots }, { expect }) {
      expect(commonFreeSlots([], [3, 7])).toEqual([[3, 7]]);
      const person = { busy: [[1, 2]] as [number, number][], workingHours: [[0, 5]] as [number, number][] };
      commonFreeSlots([person], [0, 5]);
      expect(person).toEqual({ busy: [[1, 2]], workingHours: [[0, 5]] });
    },
  },
];
