import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Drafts and copy-on-write';
const G2 = 'Sharing, freezing and revoking';
const G3 = 'Arrays, Map, Set, return values';
const G4 = 'Patches';

const makeBase = () => ({
  title: 'doc',
  count: 1,
  user: { name: 'Lin', prefs: { theme: 'dark' } },
  settings: { lang: 'en' },
  todos: [{ id: 1, done: false }, { id: 2, done: false }],
});

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'writes go to a copy; the base is untouched',
    run({ produce }, { expect }) {
      const base = { a: 1, b: 2 };
      const next = produce(base, (d) => { d.a = 10; (d as any).c = 3; delete (d as any).b; });
      expect(next).toEqual({ a: 10, c: 3 });
      expect(base).toEqual({ a: 1, b: 2 });
      expect(next).not.toBe(base);
    },
  },
  {
    group: G1,
    title: 'no-op recipes and writes back to the original return the base',
    run({ produce }, { expect }) {
      const base = makeBase();
      expect(produce(base, () => {})).toBe(base);
      expect(produce(base, (d) => { d.count = 1; d.user.name = 'Lin'; })).toBe(base);
      expect(produce(base, (d) => { d.count = 2; d.count = 1; }), 'set then set back').toBe(base);
      expect(produce(base, (d) => { d.todos[0].done = true; d.todos[0].done = false; }), 'nested set back').toBe(base);
      expect(produce(base, (d) => { delete (d as any).missing; })).toBe(base);
      const seen: unknown[] = [];
      expect(produce(base, (d) => { seen.push(d.user.prefs.theme, Object.keys(d), 'count' in d, Array.isArray(d.todos)); })).toBe(base);
      expect(seen).toEqual(['dark', ['title', 'count', 'user', 'settings', 'todos'], true, true]);
    },
  },
  {
    group: G2,
    title: 'nested writes share every untouched subtree',
    run({ produce }, { expect }) {
      const base = makeBase();
      const next = produce(base, (d) => { d.user.prefs.theme = 'light'; d.todos[1].done = true; });
      expect(next.user.prefs).toEqual({ theme: 'light' });
      expect(base.user.prefs.theme).toBe('dark');
      expect(next.settings).toBe(base.settings);
      expect(next.todos[0]).toBe(base.todos[0]);
      expect(next.todos[1]).not.toBe(base.todos[1]);
      expect(next.user).not.toBe(base.user);
    },
  },
  {
    group: G2,
    title: 'output is frozen and can be produced from again',
    run({ produce }, { expect }) {
      const base = makeBase();
      const next = produce(base, (d) => { d.user.name = 'Ada'; d.todos.push({ id: 3, done: true }); (d as any).extra = { deep: { x: 1 } }; });
      expect([Object.isFrozen(next), Object.isFrozen(next.user), Object.isFrozen(next.todos), Object.isFrozen(next.todos[2]), Object.isFrozen((next as any).extra.deep)]).toEqual([true, true, true, true, true]);
      expect(Object.isFrozen(base)).toBe(false);
      const again = produce(next, (d) => { d.user.name = 'Grace'; d.todos[2].done = false; });
      expect([again.user.name, again.todos[2].done, next.user.name, next.todos[2].done]).toEqual(['Grace', false, 'Ada', true]);
    },
  },
  {
    group: G2,
    title: 'drafts are revoked after the recipe; moved drafts are finalized',
    run({ produce }, { expect }) {
      const base = makeBase();
      let saved: any;
      let savedArr: any;
      produce(base, (d) => { saved = d.user; savedArr = d.todos; });
      expect(() => saved.name).toThrow();
      expect(() => { saved.name = 'x'; }).toThrow();
      expect(() => savedArr.length).toThrow();
      const next = produce(base, (d) => { (d as any).copyOfUser = d.user; d.user.prefs.theme = 'blue'; (d as any).wrapped = { inner: d.settings }; });
      expect((next as any).copyOfUser).toBe(next.user);
      expect(next.user.prefs.theme).toBe('blue');
      expect((next as any).wrapped.inner).toBe(base.settings);
    },
  },
  {
    group: G3,
    title: 'array methods work on drafts',
    run({ produce }, { expect }) {
      const base = { list: [3, 1, 2], items: [{ v: 1 }, { v: 2 }, { v: 3 }] };
      const next = produce(base, (d) => {
        d.list.push(4);
        d.list.sort((a, b) => a - b);
        d.items.splice(1, 1);
        d.items.unshift({ v: 0 });
        d.items[2].v = 30;
      });
      expect(next).toEqual({ list: [1, 2, 3, 4], items: [{ v: 0 }, { v: 1 }, { v: 30 }] });
      expect(next.items[1]).toBe(base.items[0]);
      expect(base).toEqual({ list: [3, 1, 2], items: [{ v: 1 }, { v: 2 }, { v: 3 }] });
      expect(produce([1, 2, 3], (d) => { d.length = 1; })).toEqual([1]);
      expect(produce(base, (d) => { d.items.map((x) => x.v); d.list.filter(Boolean); }), 'reads only').toBe(base);
    },
  },
  {
    group: G3,
    title: 'Map and Set drafts',
    run({ produce }, { expect }) {
      const base = { users: new Map([['a', { n: 1 }], ['b', { n: 2 }]]), tags: new Set(['x', 'y']) };
      const next = produce(base, (d) => {
        expect(d.users instanceof Map && d.tags instanceof Set, 'drafts keep their type').toBe(true);
        d.users.get('a')!.n = 10;
        d.users.set('c', { n: 3 });
        d.users.delete('b');
        d.tags.add('z');
        d.tags.delete('x');
      });
      expect([...next.users.entries()]).toEqual([['a', { n: 10 }], ['c', { n: 3 }]]);
      expect([...next.tags]).toEqual(['y', 'z']);
      expect(base.users.get('a')).toEqual({ n: 1 });
      expect([...base.tags]).toEqual(['x', 'y']);
      expect(next.users instanceof Map && next.tags instanceof Set).toBe(true);
      const same = produce(base, (d) => { d.users.set('a', d.users.get('a')!); d.tags.add('x'); d.users.forEach(() => {}); });
      expect(same).toBe(base);
    },
  },
  {
    group: G3,
    title: 'returning a value, nothing, primitives, and the modify-and-return error',
    run({ produce, nothing }, { expect }) {
      const base = makeBase();
      expect(produce(base, () => ({ fresh: true }) as any)).toEqual({ fresh: true });
      expect(produce(base, () => nothing as any)).toBe(undefined);
      expect(produce(base, (d) => d)).toBe(base);
      const replaced = produce(base, (d) => ({ keep: d.settings, user: d.user }) as any);
      expect((replaced as any).keep).toBe(base.settings);
      expect(produce(5, (x) => x + 1)).toBe(6);
      expect(produce('s', () => {})).toBe('s');
      expect(() => produce(base, (d) => { d.count = 5; return { other: 1 } as any; })).toThrow();
      expect(base.count).toBe(1);
    },
  },
  {
    group: G4,
    title: 'patches and inverse patches for objects and arrays',
    run({ produceWithPatches }, { expect }) {
      const base = { a: 1, gone: true, nested: { x: [1, 2, 3] }, list: [{ id: 1 }] };
      const [next, patches, inverse] = produceWithPatches(base, (d) => {
        d.a = 2;
        delete (d as any).gone;
        (d as any).added = 'new';
        d.nested.x.pop();
        d.nested.x[0] = 9;
        d.list.push({ id: 2 });
        d.list[0].id = 10;
      });
      expect(next).toEqual({ a: 2, nested: { x: [9, 2] }, list: [{ id: 10 }, { id: 2 }], added: 'new' });
      expect(patches).toEqual([
        { op: 'replace', path: ['a'], value: 2 },
        { op: 'remove', path: ['gone'] },
        { op: 'replace', path: ['nested', 'x', 0], value: 9 },
        { op: 'remove', path: ['nested', 'x', 2] },
        { op: 'replace', path: ['list', 0, 'id'], value: 10 },
        { op: 'add', path: ['list', 1], value: { id: 2 } },
        { op: 'add', path: ['added'], value: 'new' },
      ]);
      expect(inverse).toEqual([
        { op: 'replace', path: ['a'], value: 1 },
        { op: 'add', path: ['gone'], value: true },
        { op: 'replace', path: ['nested', 'x', 0], value: 1 },
        { op: 'add', path: ['nested', 'x', 2], value: 3 },
        { op: 'replace', path: ['list', 0, 'id'], value: 1 },
        { op: 'remove', path: ['list', 1] },
        { op: 'remove', path: ['added'] },
      ]);
      const [same, p2, i2] = produceWithPatches(base, () => {});
      expect([same === base, p2, i2]).toEqual([true, [], []]);
    },
  },
  {
    group: G4,
    title: 'applyPatches round-trips, including Maps, Sets and root replacement',
    run({ produceWithPatches, applyPatches }, { expect }) {
      const base = { m: new Map([['k', { v: 1 }]]), s: new Set([1]), arr: [1, 2, 3, 4], obj: { a: { b: 1 } } };
      const [next, patches, inverse] = produceWithPatches(base, (d) => {
        d.m.get('k')!.v = 2;
        d.m.set('k2', { v: 3 });
        d.s.add(2);
        d.arr.splice(1, 2);
        d.obj.a.b = 2;
      });
      const replayed = applyPatches(base, patches);
      expect(replayed).toEqual(next);
      expect(replayed.obj).not.toBe(base.obj);
      expect(base.arr).toEqual([1, 2, 3, 4]);
      expect(applyPatches(next, inverse)).toEqual(base);
      expect(patches.filter((p) => p.path[0] === 's')).toEqual([{ op: 'replace', path: ['s'], value: new Set([1, 2]) }]);
      const [root, rp, ri] = produceWithPatches(base, () => ({ replaced: true }) as any);
      expect(rp).toEqual([{ op: 'replace', path: [], value: { replaced: true } }]);
      expect(applyPatches(base, rp)).toEqual(root);
      expect(applyPatches(root, ri)).toBe(base);
      expect(applyPatches(base, [])).toBe(base);
      expect(applyPatches({ xs: [1, 2, 3] }, [{ op: 'add', path: ['xs', 1], value: 9 }, { op: 'remove', path: ['xs', 0] }]), 'array add inserts').toEqual({ xs: [9, 2, 3] });
    },
  },
];
