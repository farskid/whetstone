import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'memoizeOne';
const G2 = 'Equality, this, throws';
const G3 = 'memoize with LRU';
const G4 = 'Selectors';

function counted<A extends unknown[], R>(fn: (...a: A) => R) {
  const calls: A[] = [];
  const f = (...a: A) => { calls.push(a); return fn(...a); };
  return { f, calls };
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'caches the last call only',
    run({ memoizeOne }, { expect }) {
      const { f, calls } = counted((a: number, b: number) => a + b);
      const m = memoizeOne(f);
      expect([m(1, 2), m(1, 2), m(2, 2), m(1, 2)]).toEqual([3, 3, 4, 3]);
      expect(calls.length, 'only the last args are remembered').toBe(3);
    },
  },
  {
    group: G1,
    title: 'shallow equality: same object hits, equal-looking object misses, arg count matters',
    run({ memoizeOne }, { expect }) {
      const { f, calls } = counted((...a: unknown[]) => a.length);
      const m = memoizeOne(f);
      const o = { x: 1 };
      m(o); m(o);
      expect(calls.length).toBe(1);
      m({ x: 1 });
      expect(calls.length, 'new object').toBe(2);
      m(1); m(1, undefined);
      expect(calls.length, 'f(1) vs f(1, undefined)').toBe(4);
      m(NaN); m(NaN);
      expect(calls.length, 'NaN equals NaN').toBe(5);
    },
  },
  {
    group: G2,
    title: 'custom isEqual',
    run({ memoizeOne }, { expect }) {
      const { f, calls } = counted((p: { x: number }) => p.x * 2);
      const deep = (a: unknown[], b: unknown[]) => JSON.stringify(a) === JSON.stringify(b);
      const m = memoizeOne(f, deep);
      expect([m({ x: 2 }), m({ x: 2 }), m({ x: 3 })]).toEqual([4, 4, 6]);
      expect(calls.length).toBe(2);
    },
  },
  {
    group: G2,
    title: 'keeps the this binding and keys on it',
    run({ memoizeOne }, { expect }) {
      let calls = 0;
      const getName = memoizeOne(function (this: { name: string }, suffix: string) { calls++; return this.name + suffix; });
      const a = { name: 'a', getName };
      const b = { name: 'b', getName };
      expect([a.getName('!'), a.getName('!'), b.getName('!')]).toEqual(['a!', 'a!', 'b!']);
      expect(calls).toBe(2);
    },
  },
  {
    group: G2,
    title: 'throws are not cached; the previous result stays cached',
    run({ memoizeOne }, { expect }) {
      let calls = 0, fail = true;
      const m = memoizeOne((n: number) => { calls++; if (n < 0 && fail) throw new Error('neg'); return n * 10; });
      expect(m(1)).toBe(10);
      expect(() => m(-1)).toThrow('neg');
      expect(m(1), 'hit after the throw').toBe(10);
      expect(calls, 'f(1) cached across the failed call').toBe(2);
      fail = false;
      expect(m(-1), 'retried, not a cached error').toBe(-10);
    },
  },
  {
    group: G3,
    title: 'memoize caches every distinct tuple',
    run({ memoize }, { expect }) {
      const { f, calls } = counted((a: unknown, b?: unknown) => `${String(a)}|${String(b)}`);
      const m = memoize(f);
      m(1, 2); m(2, 1); m(1, 2); m(2, 1);
      expect(calls.length).toBe(2);
      m('1', 2);
      expect(calls.length, "'1' differs from 1").toBe(3);
    },
  },
  {
    group: G3,
    title: 'NaN, null, undefined and arity are distinct keys',
    run({ memoize }, { expect }) {
      const { f, calls } = counted((...a: unknown[]) => a.length);
      const m = memoize(f);
      m(NaN); m(NaN);
      expect(calls.length, 'NaN hits').toBe(1);
      m(null);
      expect(calls.length, 'null is not NaN').toBe(2);
      m(undefined); m();
      expect(calls.length, 'f(undefined) vs f()').toBe(4);
      m(1); m(1, undefined); m(1, undefined);
      expect(calls.length, 'f(1) vs f(1, undefined)').toBe(6);
      m(0); m(-0);
      expect(calls.length, '0 and -0 match (SameValueZero)').toBe(7);
    },
  },
  {
    group: G3,
    title: 'object args are keyed by identity',
    run({ memoize }, { expect }) {
      const { f, calls } = counted((o: { id: number }, k: string) => o.id + k);
      const m = memoize(f);
      const a = { id: 1 };
      m(a, 'x'); m(a, 'x');
      expect(calls.length).toBe(1);
      expect(m({ id: 1 }, 'x')).toBe('1x');
      expect(calls.length, 'equal-looking object is a new key').toBe(2);
      let gCalls = 0;
      const fnArg = () => 0;
      const g = memoize((h: () => number) => { gCalls++; return h(); });
      g(fnArg); g(fnArg); g(() => 0);
      expect(gCalls, 'functions are keyed by identity too').toBe(2);
    },
  },
  {
    group: G3,
    title: 'LRU eviction with max; a hit refreshes recency',
    input: 'max: 2',
    run({ memoize }, { expect }) {
      const { f, calls } = counted((n: number) => n * n);
      const m = memoize(f, { max: 2 });
      m(1); m(2);
      m(1);          // hit: 1 is now most recent
      m(3);          // evicts 2
      expect(calls.length).toBe(3);
      m(1);
      expect(calls.length, '1 survived').toBe(3);
      m(2);
      expect(calls.length, '2 was evicted').toBe(4);
      m(3);
      expect(calls.length, '3 was evicted by 2').toBe(5);
    },
  },
  {
    group: G3,
    title: 'memoize: throws not cached, this passed through, clear() empties',
    run({ memoize }, { expect }) {
      let calls = 0, fail = true;
      const m = memoize(function (this: unknown, n: number) { calls++; if (fail) throw new Error('boom'); return [this, n]; });
      expect(() => m(1)).toThrow('boom');
      fail = false;
      const self = { tag: 'me' };
      expect(m.call(self, 1)).toEqual([self, 1]);
      m(1);
      expect(calls).toBe(2);
      m.clear();
      m(1);
      expect(calls).toBe(3);
    },
  },
  {
    group: G3,
    title: 'recursive memoize (fib 90) runs fast',
    run({ memoize }, { expect }) {
      const fib: (n: number) => number = memoize((n: number): number => (n < 2 ? n : fib(n - 1) + fib(n - 2)), { max: 1000 });
      expect(fib(90)).toBe(2880067194370816000);
    },
  },
  {
    group: G4,
    title: 'createSelector recomputes only when an input changes',
    run({ createSelector }, { expect }) {
      type State = { items: number[]; rate: number; ui: string };
      const total = createSelector([(s: State) => s.items, (s: State) => s.rate], (items: number[], rate: number) => items.reduce((a, b) => a + b, 0) * (1 + rate));
      const items = [10, 20];
      let s: State = { items, rate: 0.5, ui: 'a' };
      expect(total(s)).toBe(45);
      s = { ...s, ui: 'b' };
      expect(total(s)).toBe(45);
      expect(total.recomputations(), 'unrelated change').toBe(1);
      s = { ...s, items: [...items, 10] };
      expect(total(s)).toBe(60);
      expect(total.recomputations()).toBe(2);
      total.resetRecomputations();
      total(s);
      expect(total.recomputations()).toBe(0);
    },
  },
  {
    group: G4,
    title: 'selector extra args reach the inputs',
    run({ createSelector }, { expect }) {
      const byId = createSelector(
        [(s: { users: Record<string, string> }) => s.users, (_s: unknown, id: string) => id],
        (users: Record<string, string>, id: string) => users[id] ?? 'unknown',
      );
      const s = { users: { a: 'Ann', b: 'Bob' } };
      expect([byId(s, 'a'), byId(s, 'a'), byId(s, 'b'), byId(s, 'zz')]).toEqual(['Ann', 'Ann', 'Bob', 'unknown']);
      expect(byId.recomputations()).toBe(3);
    },
  },
];
