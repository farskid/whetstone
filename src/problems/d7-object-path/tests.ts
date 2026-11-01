import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'get';
const G2 = 'set and setIn';
const G3 = 'Wildcards';
const G4 = 'Filters';

const data = () => ({
  user: { name: 'Ada', age: 0, nick: '', admin: false, boss: null as null | { name: string }, 'first.last': 'A.L' },
  items: [
    { name: 'pen', price: 3, tags: ['office'], stock: { qty: 10 } },
    { name: 'lamp', price: 40, tags: ['home', 'office'], stock: { qty: 0 } },
    { name: 'mug', price: 12, tags: ['home'], active: true },
  ],
});

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'dots, indexes, quoted keys and array paths',
    run({ get }, { expect }) {
      const d = data();
      expect(get(d, 'items[1].name')).toBe('lamp');
      expect(get(d, 'items.2.price')).toBe(12);
      expect(get(d, "user['first.last']")).toBe('A.L');
      expect(get({ 'a"b': { "c'd": 1 } }, `["a\\"b"]['c\\'d']`)).toBe(1);
      expect(get(d, ['items', 0, 'stock', 'qty'])).toBe(10);
      expect(get(d, '')).toBe(d);
    },
  },
  {
    group: G1,
    title: 'defaults: missing steps and null partway; falsy values are real',
    run({ get }, { expect }) {
      const d = data();
      expect(get(d, 'items[9].name', 'none')).toBe('none');
      expect(get(d, 'user.boss.name', 'none'), 'null in the middle').toBe('none');
      expect(get(d, 'user.name.first', 'none'), 'string in the middle').toBe('none');
      expect(get(d, 'user.age', 99)).toBe(0);
      expect(get(d, 'user.nick', 'x')).toBe('');
      expect(get(d, 'user.admin', true)).toBe(false);
      expect(get(d, 'user.boss', 'x')).toBeNull();
      expect(get({ a: undefined }, 'a', 'd')).toBe('d');
      expect(get(d, 'user.missing')).toBeUndefined();
    },
  },
  {
    group: G1,
    title: 'prototype keys are never followed; malformed paths throw',
    run({ get }, { expect }) {
      expect(get({}, 'constructor', 'safe')).toBe('safe');
      expect(get({}, '__proto__.toString', 'safe')).toBe('safe');
      expect(get(JSON.parse('{"__proto__":{"x":1}}'), '__proto__.x', 'safe'), 'even as an own key').toBe('safe');
      expect(get({ a: {} }, 'a.toString', 'safe'), 'inherited properties are missing').toBe('safe');
      for (const bad of ['a..b', 'a.', 'a[', 'a[x]', "a['x"]) expect(() => get({}, bad), bad).toThrow();
      expect(() => get({}, 'a.*'), 'wildcards are query-only').toThrow();
    },
  },
  {
    group: G2,
    title: 'set creates arrays for numeric keys and objects otherwise',
    run({ set }, { expect }) {
      const o: Record<string, unknown> = {};
      expect(set(o, 'a[0].b.2', 'x')).toBe(o);
      const a = o.a as Array<{ b: unknown[] }>;
      expect(Array.isArray(a)).toBe(true);
      expect(Array.isArray(a[0].b)).toBe(true);
      expect(a[0].b).toHaveLength(3);
      expect(a[0].b[2]).toBe('x');
      set(o, "c['k.j']", 1);
      expect(o.c).toEqual({ 'k.j': 1 });
      const p = { a: 5 };
      set(p, 'a.b', 1);
      expect(p).toEqual({ a: { b: 1 } });
      set(p, ['x', 1], 'y');
      expect(Array.isArray((p as Record<string, unknown>).x)).toBe(true);
    },
  },
  {
    group: G2,
    title: 'setIn copies the path and shares everything else',
    run({ setIn }, { expect }) {
      const d = data();
      const before = JSON.stringify(d);
      const n = setIn(d, 'items[1].stock.qty', 5);
      expect(JSON.stringify(d), 'original untouched').toBe(before);
      expect(n.items[1].stock!.qty).toBe(5);
      expect(n).not.toBe(d);
      expect(n.items).not.toBe(d.items);
      expect(Array.isArray(n.items)).toBe(true);
      expect(n.items[1]).not.toBe(d.items[1]);
      expect(n.items[0], 'sibling shared').toBe(d.items[0]);
      expect(n.user, 'untouched branch shared').toBe(d.user);
      const fresh = setIn({} as Record<string, unknown>, 'list.0.v', 1);
      expect(Array.isArray(fresh.list)).toBe(true);
    },
  },
  {
    group: G2,
    title: 'writes through __proto__, constructor or prototype throw and change nothing',
    run({ set, setIn }, { expect }) {
      try {
        expect(() => set({}, '__proto__.polluted', true)).toThrow('Forbidden key: __proto__');
        expect(() => set({}, 'a.constructor.prototype.polluted', true)).toThrow('Forbidden key');
        expect(() => setIn({}, ['x', 'prototype'], 1)).toThrow('Forbidden key: prototype');
        const o = { a: 1 };
        expect(() => set(o, 'b.__proto__', 1)).toThrow();
        expect(o, 'nothing created before the throw').toEqual({ a: 1 });
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      } finally {
        // Undo any pollution so a broken solution can't leak into later tests.
        delete (Object.prototype as any).polluted;
      }
    },
  },
  {
    group: G3,
    title: 'wildcards return every match with its concrete path',
    run({ query }, { expect }) {
      const d = data();
      expect(query(d, 'items[*].name')).toEqual([
        { path: ['items', 0, 'name'], value: 'pen' },
        { path: ['items', 1, 'name'], value: 'lamp' },
        { path: ['items', 2, 'name'], value: 'mug' },
      ]);
      expect(query(d, 'items.*.stock.qty').map((m) => m.value), 'missing keys drop out').toEqual([10, 0]);
      expect(query({ a: { x: { b: 1 }, y: { c: 2 }, z: { b: 3 } } }, 'a.*.b')).toEqual([
        { path: ['a', 'x', 'b'], value: 1 },
        { path: ['a', 'z', 'b'], value: 3 },
      ]);
    },
  },
  {
    group: G3,
    title: 'plain keys, nested wildcards and non-containers',
    run({ query }, { expect }) {
      const d = data();
      expect(query(d, 'user.age')).toEqual([{ path: ['user', 'age'], value: 0 }]);
      expect(query(d, 'user.nope')).toEqual([]);
      expect(query(d, 'items[*].tags[*]')).toHaveLength(4);
      expect(query({ a: 5, b: [1] }, '*[*]')).toEqual([{ path: ['b', 0], value: 1 }]);
      expect(query({}, '__proto__')).toEqual([]);
    },
  },
  {
    group: G4,
    title: 'comparisons, contains and &&',
    run({ query }, { expect }) {
      const d = data();
      const names = (p: string) => query(d, p).map((m) => m.value);
      expect(names('items[?(@.price > 10 && @.tags contains "office")].name')).toEqual(['lamp']);
      expect(names("items[?(@.name == 'mug')].price")).toEqual([12]);
      expect(names('items[?(@.price <= 12)].name')).toEqual(['pen', 'mug']);
      expect(names('items[?(@.name contains "am")].name')).toEqual(['lamp']);
      expect(names('items[?(@.stock.qty == 0)].name')).toEqual(['lamp']);
    },
  },
  {
    group: G4,
    title: 'precedence, parentheses, truthiness and type-safe comparisons',
    run({ query }, { expect }) {
      const d = data();
      const names = (p: string) => query(d, p).map((m) => m.value);
      expect(names('items[?(@.price < 5 || @.price > 30 && @.tags contains "home")].name')).toEqual(['pen', 'lamp']);
      expect(names('items[?((@.price < 5 || @.price > 30) && @.tags contains "office")].name')).toEqual(['pen', 'lamp']);
      expect(names('items[?((@.price < 5 || @.price > 10) && @.tags contains "home")].name')).toEqual(['lamp', 'mug']);
      expect(names('items[?(@.active)].name')).toEqual(['mug']);
      expect(names('items[?(@.missing < 100)].name'), 'undefined never compares').toEqual([]);
      expect(query({ xs: [{ v: '10' }, { v: 10 }] }, 'xs[?(@.v > 5)]').map((m) => m.path)).toEqual([['xs', 1]]);
      expect(query({ m: { a: { on: true }, b: { on: false } } }, 'm[?(@.on == true)]').map((m) => m.path)).toEqual([['m', 'a']]);
      expect(() => query(d, 'items[?(@.price >)]')).toThrow();
    },
  },
];
