import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Add, score, rank';
const G2 = 'Ranges';
const G3 = 'Leaderboard';
const G4 = 'Dense rank and paging';
const G5 = 'Performance';

const names = (es: { member: string }[]) => es.map((e) => e.member);

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'add, score, rank and size',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      expect(z.add('a', 30)).toBe(true);
      z.add('b', 10); z.add('c', 20);
      expect([z.size, z.score('c'), z.score('nope')]).toEqual([3, 20, undefined]);
      expect(['a', 'b', 'c', 'nope'].map((m) => z.rank(m))).toEqual([2, 0, 1, undefined]);
    },
  },
  {
    group: G1,
    title: 're-adding a member moves it and keeps size',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      z.add('a', 1); z.add('b', 2); z.add('c', 3);
      expect(z.add('a', 10), 'not new').toBe(false);
      expect([z.size, z.rank('a'), z.rank('b'), z.rank('c')]).toEqual([3, 2, 0, 1]);
      expect(z.score('a')).toBe(10);
      expect(z.add('a', 10), 'same score again').toBe(false);
      expect(z.size).toBe(3);
    },
  },
  {
    group: G1,
    title: 'equal scores order by member name',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      for (const m of ['mia', 'al', 'zed', 'bo']) z.add(m, 5);
      expect(['al', 'bo', 'mia', 'zed'].map((m) => z.rank(m))).toEqual([0, 1, 2, 3]);
      z.add('Zed', 5);
      expect(z.rank('Zed'), 'code-unit order: uppercase first').toBe(0);
    },
  },
  {
    group: G1,
    title: 'remove; NaN rejected; ±Infinity allowed',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      z.add('a', 1); z.add('lo', -Infinity); z.add('hi', Infinity);
      expect(z.remove('a')).toBe(true);
      expect(z.remove('a')).toBe(false);
      expect([z.size, z.rank('hi'), z.rank('a')]).toEqual([2, 1, undefined]);
      let err: unknown; try { z.add('x', NaN); } catch (e) { err = e; }
      expect(err instanceof RangeError, 'RangeError for NaN').toBe(true);
      expect(z.size).toBe(2);
    },
  },
  {
    group: G2,
    title: 'rangeByRank with negative and out-of-range indices',
    input: 'a..e with scores 1..5',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      ['a', 'b', 'c', 'd', 'e'].forEach((m, i) => z.add(m, i + 1));
      expect(names(z.rangeByRank(1, 2))).toEqual(['b', 'c']);
      expect(names(z.rangeByRank(-2, -1))).toEqual(['d', 'e']);
      expect(names(z.rangeByRank(-100, 1))).toEqual(['a', 'b']);
      expect(names(z.rangeByRank(3, 100))).toEqual(['d', 'e']);
      expect(z.rangeByRank(3, 1)).toEqual([]);
      expect(z.rangeByRank(0, 0, { rev: true })).toEqual([{ member: 'e', score: 5 }]);
      expect(new SortedSet().rangeByRank(0, -1)).toEqual([]);
    },
  },
  {
    group: G2,
    title: 'rangeByScore inclusive and exclusive bounds',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      [1, 5, 5, 7, 10].forEach((s, i) => z.add('m' + i, s));
      expect(names(z.rangeByScore(5, 7))).toEqual(['m1', 'm2', 'm3']);
      expect(names(z.rangeByScore('(5', 10))).toEqual(['m3', 'm4']);
      expect(names(z.rangeByScore(1, '(5'))).toEqual(['m0']);
      expect(z.rangeByScore('(5', '(7')).toEqual([]);
      expect(names(z.rangeByScore('7', '10'))).toEqual(['m3', 'm4']);
    },
  },
  {
    group: G2,
    title: 'rangeByScore with infinite bounds and paging',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      z.add('lo', -Infinity); z.add('a', 1); z.add('b', 2); z.add('c', 3); z.add('hi', Infinity);
      expect(names(z.rangeByScore('-inf', '+inf'))).toEqual(['lo', 'a', 'b', 'c', 'hi']);
      expect(names(z.rangeByScore(-Infinity, 2))).toEqual(['lo', 'a', 'b']);
      expect(names(z.rangeByScore('(-inf', '(+inf'))).toEqual(['a', 'b', 'c']);
      expect(names(z.rangeByScore('-inf', '+inf', { offset: 1, count: 2 }))).toEqual(['a', 'b']);
      expect(names(z.rangeByScore(2, '+inf', { offset: 5 }))).toEqual([]);
    },
  },
  {
    group: G3,
    title: 'incrBy creates and moves members',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      expect(z.incrBy('new', 5)).toBe(5);
      z.add('x', 10);
      expect(z.incrBy('new', 7)).toBe(12);
      expect([z.rank('new'), z.revRank('new'), z.size]).toEqual([1, 0, 2]);
      expect(z.incrBy('new', -12)).toBe(0);
      expect(z.revRank('new')).toBe(1);
    },
  },
  {
    group: G3,
    title: 'revRank and reverse ranges are the exact reverse order',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      z.add('ana', 100); z.add('bo', 100); z.add('cy', 50); z.add('di', 200);
      expect(['di', 'bo', 'ana', 'cy'].map((m) => z.revRank(m))).toEqual([0, 1, 2, 3]);
      expect(names(z.rangeByRank(0, 2, { rev: true }))).toEqual(['di', 'bo', 'ana']);
    },
  },
  {
    group: G4,
    title: 'dense rank shares ranks between ties with no gaps',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      z.add('a', 300); z.add('b', 200); z.add('c', 200); z.add('d', 100); z.add('e', 100); z.add('f', 50);
      expect(['a', 'b', 'c', 'd', 'e', 'f', 'zz'].map((m) => z.denseRevRank(m))).toEqual([0, 1, 1, 2, 2, 3, undefined]);
      z.incrBy('a', -100);
      expect(['a', 'b', 'd', 'f'].map((m) => z.denseRevRank(m)), 'after a ties with b').toEqual([0, 0, 1, 2]);
      z.remove('d'); z.remove('e');
      expect(z.denseRevRank('f'), 'score 100 gone').toBe(1);
    },
  },
  {
    group: G4,
    title: 'around(member, k) pages the leaderboard',
    input: 'p0..p9 with score = 10 * index',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      for (let i = 0; i < 10; i++) z.add('p' + i, i * 10);
      expect(names(z.around('p5', 2))).toEqual(['p7', 'p6', 'p5', 'p4', 'p3']);
      expect(names(z.around('p9', 2)), 'top').toEqual(['p9', 'p8', 'p7']);
      expect(names(z.around('p0', 1)), 'bottom').toEqual(['p1', 'p0']);
      expect(z.around('nobody', 3)).toEqual([]);
      expect(z.around('p3', 0)).toEqual([{ member: 'p3', score: 30 }]);
    },
  },
  {
    group: G5,
    title: 'perf: 100k members with ranks and increments',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      const t0 = performance.now();
      const budget = 1500;
      let seed = 7, done = 0;
      for (let i = 0; i < 100_000; i++) {
        seed = (seed * 16807) % 2147483647;
        z.add('u' + i, seed % 50_000);
        if ((i & 1023) === 0 && performance.now() - t0 > budget) break;
        done++;
      }
      expect(done, 'adds finished in time').toBe(100_000);
      let check = 0;
      for (let i = 0; i < 20_000; i++) {
        z.incrBy('u' + ((i * 7919) % 100_000), 3);
        check += z.rank('u' + i)!;
        if ((i & 1023) === 0 && performance.now() - t0 > budget) break;
      }
      expect(performance.now() - t0, 'ms').toBeLessThan(budget);
      expect(z.size).toBe(100_000);
      expect(check, 'sanity').toBeGreaterThan(0);
      const top = z.rangeByRank(0, 0, { rev: true })[0];
      expect(z.revRank(top.member)).toBe(0);
    },
  },
  {
    group: G5,
    title: 'random ops match a naive model',
    run({ SortedSet }, { expect }) {
      const z = new SortedSet();
      const model = new Map<string, number>();
      let seed = 3;
      const rnd = (n: number) => { seed = (seed * 16807) % 2147483647; return seed % n; };
      for (let step = 0; step < 3000; step++) {
        const m = 'k' + rnd(60);
        const op = rnd(4);
        if (op === 0) { z.remove(m); model.delete(m); }
        else if (op === 1) { const d = rnd(5) - 2; z.incrBy(m, d); model.set(m, (model.get(m) ?? 0) + d); }
        else { const s = rnd(20); z.add(m, s); model.set(m, s); }
      }
      const sorted = [...model].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([member, score]) => ({ member, score }));
      expect(z.rangeByRank(0, -1)).toEqual(sorted);
      expect(sorted.every((e, i) => z.rank(e.member) === i), 'ranks agree').toBe(true);
    },
  },
];
