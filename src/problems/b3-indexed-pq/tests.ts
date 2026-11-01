import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Binary heap';
const G2 = 'Ids, update and remove';
const G3 = 'Stable ties';
const G4 = 'Virtual timers';

/** Deterministic PRNG so property tests are repeatable. */
function rng(seed: number) {
  return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'pops in ascending priority order',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ<string>();
      [5, 1, 4, 2, 3].forEach((p) => q.push(`id${p}`, p, `v${p}`));
      expect(q.size).toBe(5);
      expect(q.peek()).toEqual({ id: 'id1', priority: 1, value: 'v1' });
      const out: number[] = [];
      while (q.size) out.push(q.pop()!.priority);
      expect(out).toEqual([1, 2, 3, 4, 5]);
    },
  },
  {
    group: G1,
    title: 'custom comparator (max-heap)',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ<undefined, number>((a, b) => b - a);
      [3, 9, 1].forEach((p, i) => q.push(i, p));
      expect([q.pop()!.priority, q.pop()!.priority, q.pop()!.priority]).toEqual([9, 3, 1]);
    },
  },
  {
    group: G1,
    title: 'pop and peek on an empty queue return undefined',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ();
      expect(q.pop()).toBeUndefined();
      expect(q.peek()).toBeUndefined();
      expect(q.size).toBe(0);
    },
  },
  {
    group: G2,
    title: 'duplicate push throws; has() tracks membership',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ();
      q.push('a', 1);
      expect(() => q.push('a', 2)).toThrow();
      expect([q.has('a'), q.has('b')]).toEqual([true, false]);
      q.pop();
      expect(q.has('a'), 'after pop').toBe(false);
      q.push('a', 3);
      expect(q.size, 're-push after pop').toBe(1);
    },
  },
  {
    group: G2,
    title: 'update can move an item up or down',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ();
      for (let i = 0; i < 10; i++) q.push(`n${i}`, i);
      expect(q.update('n9', -1), 'decrease').toBe(true);
      expect(q.update('n0', 100), 'increase').toBe(true);
      const out: string[] = [];
      while (q.size) out.push(String(q.pop()!.id));
      expect(out).toEqual(['n9', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n0']);
    },
  },
  {
    group: G2,
    title: 'remove from the middle keeps the order right',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ();
      [10, 20, 30, 40, 50, 60, 70, 15, 25].forEach((p) => q.push(p, p));
      expect(q.remove(40)).toBe(true);
      expect(q.remove(20)).toBe(true);
      const out: number[] = [];
      while (q.size) out.push(q.pop()!.priority);
      expect(out).toEqual([10, 15, 25, 30, 50, 60, 70]);
    },
  },
  {
    group: G2,
    title: 'update/remove of a missing id return false',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ();
      q.push('a', 1);
      expect([q.update('zz', 3), q.remove('zz')]).toEqual([false, false]);
      expect(q.size).toBe(1);
    },
  },
  {
    group: G2,
    title: 'property: random push/pop/update/remove matches a sorted reference',
    input: '3000 random ops, seeded',
    run({ IndexedPQ }, { expect }) {
      const rand = rng(42);
      const q = new IndexedPQ();
      const ref = new Map<number, number>();
      let nextId = 0, mismatches = 0;
      for (let op = 0; op < 3000; op++) {
        const r = rand();
        const ids = [...ref.keys()];
        if (r < 0.4 || !ids.length) { const p = Math.floor(rand() * 1000); q.push(nextId, p); ref.set(nextId++, p); }
        else if (r < 0.6) { const id = ids[Math.floor(rand() * ids.length)]; const p = Math.floor(rand() * 1000); q.update(id, p); ref.set(id, p); }
        else if (r < 0.75) { const id = ids[Math.floor(rand() * ids.length)]; q.remove(id); ref.delete(id); }
        else {
          const got = q.pop()!;
          const min = Math.min(...ref.values());
          if (got.priority !== min || ref.get(got.id as number) !== min) mismatches++;
          ref.delete(got.id as number);
        }
      }
      expect(mismatches, 'pops that were not the minimum').toBe(0);
      expect(q.size).toBe(ref.size);
    },
  },
  {
    group: G2,
    title: 'perf: 100k pushes, 50k updates, 100k pops',
    run({ IndexedPQ }, { expect }) {
      const rand = rng(7);
      const q = new IndexedPQ();
      const t0 = performance.now();
      for (let i = 0; i < 100_000; i++) q.push(i, rand());
      for (let i = 0; i < 50_000; i++) q.update(Math.floor(rand() * 100_000), rand());
      let prev = -1, ok = true;
      while (q.size) { const p = q.pop()!.priority; if (p < prev) ok = false; prev = p; }
      expect(ok, 'sorted').toBe(true);
      expect(performance.now() - t0, 'ms').toBeLessThan(1000);
    },
  },
  {
    group: G3,
    title: 'equal priorities come out in push order',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ();
      for (let i = 0; i < 12; i++) q.push(`t${i}`, i % 3);
      const out: string[] = [];
      while (q.size) out.push(String(q.pop()!.id));
      expect(out).toEqual(['t0', 't3', 't6', 't9', 't1', 't4', 't7', 't10', 't2', 't5', 't8', 't11']);
    },
  },
  {
    group: G3,
    title: 'an updated item goes behind existing items with the same priority',
    run({ IndexedPQ }, { expect }) {
      const q = new IndexedPQ();
      q.push('a', 1); q.push('b', 1); q.push('c', 5);
      q.update('a', 1); q.update('c', 1);
      expect([q.pop()!.id, q.pop()!.id, q.pop()!.id]).toEqual(['b', 'a', 'c']);
    },
  },
  {
    group: G4,
    title: 'timers run in due order with now() set to their time',
    run({ VirtualTimers }, { expect }) {
      const t = new VirtualTimers();
      const log: string[] = [];
      t.setTimeout(() => log.push(`b@${t.now()}`), 20);
      t.setTimeout(() => log.push(`a@${t.now()}`), 10);
      t.setTimeout(() => log.push(`c@${t.now()}`), 20);
      t.advance(15);
      expect(log, 'after 15').toEqual(['a@10']);
      t.advance(5);
      expect(log).toEqual(['a@10', 'b@20', 'c@20']);
      expect(t.now()).toBe(20);
    },
  },
  {
    group: G4,
    title: 'clearTimeout cancels, also from inside a callback',
    run({ VirtualTimers }, { expect }) {
      const t = new VirtualTimers();
      const log: string[] = [];
      const b = t.setTimeout(() => log.push('b'), 20);
      t.setTimeout(() => { log.push('a'); t.clearTimeout(b); }, 10);
      const c = t.setTimeout(() => log.push('c'), 5);
      t.clearTimeout(c); t.clearTimeout(999);
      t.advance(100);
      expect(log).toEqual(['a']);
    },
  },
  {
    group: G4,
    title: 'timers added by callbacks run in the same advance, including 0 ms',
    run({ VirtualTimers }, { expect }) {
      const t = new VirtualTimers();
      const log: string[] = [];
      t.setTimeout(() => {
        log.push(`outer@${t.now()}`);
        t.setTimeout(() => log.push(`zero@${t.now()}`), 0);
        t.setTimeout(() => log.push(`later@${t.now()}`), 30);
        t.setTimeout(() => log.push(`beyond@${t.now()}`), 100);
      }, 10);
      t.setTimeout(() => log.push(`sibling@${t.now()}`), 10);
      t.advance(50);
      expect(log).toEqual(['outer@10', 'sibling@10', 'zero@10', 'later@40']);
      expect(t.now()).toBe(50);
    },
  },
];
