import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

type Ev = [unknown, unknown, string];
const recorder = () => {
  const events: Ev[] = [];
  return { events, onEvict: (k: unknown, v: unknown, r: string) => { events.push([k, v, r]); } };
};

export const tests: TestCase<M>[] = [
  {
    title: 'set / get / has / delete basics',
    run({ LRUCache }, { expect }) {
      const c = new LRUCache<string, number>({ max: 3 });
      expect(c.set('a', 1)).toBe(c);
      expect(c.get('a')).toBe(1);
      expect(c.has('a')).toBe(true);
      expect(c.get('zzz')).toBeUndefined();
      expect(c.delete('a')).toBe(true);
      expect(c.delete('a')).toBe(false);
      expect(c.has('a')).toBe(false);
      expect(c.size).toBe(0);
    },
  },
  {
    title: 'evicts the least recently used entry at max',
    input: 'max 3: set a b c, set d',
    run({ LRUCache }, { expect }) {
      const c = new LRUCache<string, number>({ max: 3 });
      c.set('a', 1).set('b', 2).set('c', 3).set('d', 4);
      expect(c.has('a')).toBe(false);
      expect(c.keys()).toEqual(['d', 'c', 'b']);
      expect(c.size).toBe(3);
    },
  },
  {
    title: 'get() refreshes recency, peek() and has() do not',
    input: 'max 3: set a b c, get a, peek b, has b, set d',
    run({ LRUCache }, { expect }) {
      const c = new LRUCache<string, number>({ max: 3 });
      c.set('a', 1).set('b', 2).set('c', 3);
      c.get('a');
      expect(c.peek('b')).toBe(2);
      c.has('b');
      c.set('d', 4);
      expect(c.keys()).toEqual(['d', 'a', 'c']);
    },
  },
  {
    title: 'set() on an existing key updates it and makes it most recent',
    run({ LRUCache }, { expect }) {
      const c = new LRUCache<string, number>({ max: 2 });
      c.set('a', 1).set('b', 2).set('a', 10).set('c', 3);
      expect(c.keys()).toEqual(['c', 'a']);
      expect(c.get('a')).toBe(10);
    },
  },
  {
    title: 'stores falsy values and non-string keys',
    input: 'keys: 0, {}, NaN; values: 0, "", undefined, null',
    run({ LRUCache }, { expect }) {
      const c = new LRUCache<unknown, unknown>({ max: 10 });
      const obj = {};
      c.set(0, 0).set(obj, '').set(NaN, null).set('u', undefined);
      expect(c.get(0)).toBe(0);
      expect(c.get(obj)).toBe('');
      expect(c.get(NaN)).toBeNull();
      expect(c.has('u'), 'a stored undefined still counts').toBe(true);
      expect(c.has({}), 'keys compare by identity').toBe(false);
      expect(c.size).toBe(4);
    },
  },
  {
    title: 'default ttl: entries expire at exactly setAt + ttl',
    input: 'ttl 100, set at t=0; read at 99 and 100',
    run({ LRUCache }, { expect, clock }) {
      const clk = clock();
      const c = new LRUCache<string, number>({ max: 10, ttl: 100, clock: clk });
      c.set('a', 1);
      clk.tick(99);
      expect(c.get('a')).toBe(1);
      clk.tick(1);
      expect(c.get('a')).toBeUndefined();
      expect(c.has('a')).toBe(false);
      expect(c.size).toBe(0);
    },
  },
  {
    title: 'per-entry ttl overrides the default; ttl 0 never expires',
    run({ LRUCache }, { expect, clock }) {
      const clk = clock(1000);
      const c = new LRUCache<string, number>({ max: 10, ttl: 50, clock: clk });
      c.set('short', 1, { ttl: 10 }).set('default', 2).set('forever', 3, { ttl: 0 });
      clk.tick(10);
      expect([c.has('short'), c.has('default'), c.has('forever')]).toEqual([false, true, true]);
      clk.tick(1_000_000);
      expect(c.keys()).toEqual(['forever']);
    },
  },
  {
    title: 'setting a key again resets its TTL; get() does not',
    run({ LRUCache }, { expect, clock }) {
      const clk = clock();
      const c = new LRUCache<string, number>({ max: 10, ttl: 100, clock: clk });
      c.set('a', 1).set('b', 1);
      clk.tick(80);
      c.set('a', 2); c.get('b');
      clk.tick(30);
      expect(c.get('a')).toBe(2);
      expect(c.get('b'), 'get() must not extend the TTL').toBeUndefined();
    },
  },
  {
    title: 'onEvict reasons: evict, expire, delete, overwrite',
    run({ LRUCache }, { expect, clock }) {
      const clk = clock();
      const r = recorder();
      const c = new LRUCache<string, number>({ max: 2, ttl: 100, clock: clk, onEvict: r.onEvict });
      c.set('a', 1).set('b', 2).set('c', 3);       // evicts a
      c.set('b', 20);                              // overwrite b (old value 2)
      c.set('b', 20);                              // same value: nothing
      c.delete('c');                               // delete
      clk.tick(100);
      expect(c.get('b')).toBeUndefined();          // expire
      expect(r.events).toEqual([['a', 1, 'evict'], ['b', 2, 'overwrite'], ['c', 3, 'delete'], ['b', 20, 'expire']]);
    },
  },
  {
    title: 'purgeStale() removes and reports expired entries',
    run({ LRUCache }, { expect, clock }) {
      const clk = clock();
      const r = recorder();
      const c = new LRUCache<string, number>({ max: 10, clock: clk, onEvict: r.onEvict });
      c.set('a', 1, { ttl: 10 }).set('b', 2, { ttl: 20 }).set('c', 3);
      clk.tick(15);
      expect(c.purgeStale()).toBe(1);
      expect(c.purgeStale()).toBe(0);
      expect(r.events).toEqual([['a', 1, 'expire']]);
      expect(c.keys()).toEqual(['c', 'b']);
    },
  },
  {
    title: 'clear() fires delete for every entry',
    run({ LRUCache }, { expect }) {
      const r = recorder();
      const c = new LRUCache<string, number>({ max: 10, onEvict: r.onEvict });
      c.set('a', 1).set('b', 2);
      c.clear();
      expect(c.size).toBe(0);
      expect(r.events.map((e) => e[2])).toEqual(['delete', 'delete']);
      expect(r.events.map((e) => e[0]).sort()).toEqual(['a', 'b']);
    },
  },
  {
    title: 'expired entries do not count towards size or keys()',
    run({ LRUCache }, { expect, clock }) {
      const clk = clock();
      const c = new LRUCache<number, number>({ max: 10, clock: clk });
      for (let i = 0; i < 5; i++) c.set(i, i, { ttl: i % 2 ? 10 : 0 });
      clk.tick(10);
      expect(c.size).toBe(3);
      expect(c.keys()).toEqual([4, 2, 0]);
    },
  },
  {
    title: 'maxSize evicts LRU entries until the new one fits',
    input: 'maxSize 10, sizeOf = string length',
    run({ LRUCache }, { expect }) {
      const r = recorder();
      const c = new LRUCache<string, string>({ max: 100, maxSize: 10, sizeOf: (v) => v.length, onEvict: r.onEvict });
      c.set('a', 'xxxx').set('b', 'xxxx');   // 8
      c.get('a');                            // b is now LRU
      c.set('c', 'xxxxx');                   // needs 5 → evict b (4) → 9
      expect(c.keys()).toEqual(['c', 'a']);
      c.set('a', 'x');                       // overwrite shrinks: 6
      c.set('d', 'xxxx');                    // 10 fits exactly
      expect(c.keys()).toEqual(['d', 'a', 'c']);
      expect(r.events).toEqual([['b', 'xxxx', 'evict'], ['a', 'xxxx', 'overwrite']]);
    },
  },
  {
    title: 'an item bigger than maxSize is not stored (and drops the old value)',
    run({ LRUCache }, { expect }) {
      const r = recorder();
      const c = new LRUCache<string, string>({ max: 100, maxSize: 5, sizeOf: (v) => v.length, onEvict: r.onEvict });
      c.set('keep', 'xx').set('a', 'xx');
      c.set('a', 'xxxxxx');
      expect(c.has('a')).toBe(false);
      expect(c.get('keep'), 'unrelated entries stay').toBe('xx');
      c.set('b', 'xxxxxxx');
      expect(c.has('b')).toBe(false);
      expect(r.events).toEqual([['a', 'xx', 'delete']]);
    },
  },
  {
    title: 'invalid options and sizes throw TypeError',
    run({ LRUCache }, { expect }) {
      for (const max of [0, -1, 2.5, NaN]) {
        let err: unknown;
        try { new LRUCache({ max }); } catch (e) { err = e; }
        expect(err, `max ${max}`).toBeInstanceOf(TypeError);
      }
      const c = new LRUCache<string, number>({ max: 5, maxSize: 10, sizeOf: (v) => v });
      for (const bad of [0, -3, NaN]) {
        let err: unknown;
        try { c.set('k', bad); } catch (e) { err = e; }
        expect(err, `size ${bad}`).toBeInstanceOf(TypeError);
      }
    },
  },
  {
    title: 'O(1) operations: 50k mixed ops stay fast',
    input: 'max 1000, 50,000 set/get with a cycling key space of 2000',
    run({ LRUCache }, { expect }) {
      const c = new LRUCache<number, number>({ max: 1000 });
      const start = Date.now();
      for (let i = 0; i < 50_000; i++) {
        c.set(i % 2000, i);
        c.get((i * 7) % 2000);
        c.has(i % 1500);
      }
      const ms = Date.now() - start;
      expect(c.size).toBe(1000);
      expect(ms, 'elapsed ms (an O(n) list scan takes seconds)').toBeLessThan(400);
    },
  },
];
