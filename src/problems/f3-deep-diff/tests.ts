import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Equality';
const G2 = 'Diff';
const G3 = 'Apply';
const G4 = 'Moves and round-trips';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function randomValue(r: () => number, depth: number): unknown {
  const k = r();
  if (depth > 3 || k < 0.35) return [0, 1, -1, 'a', 'b/c', '~x', true, null, NaN][Math.floor(r() * 9)];
  if (k < 0.65) return Array.from({ length: Math.floor(r() * 5) }, () => randomValue(r, depth + 1));
  const o: Record<string, unknown> = {};
  for (let i = Math.floor(r() * 5); i > 0; i--) o[['a', 'b', 'c', 'x/y', 'm~n', ''][Math.floor(r() * 6)]] = randomValue(r, depth + 1);
  return o;
}

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'isEqual: SameValueZero, Dates, key order',
    run({ isEqual }, { expect }) {
      expect([isEqual(NaN, NaN), isEqual(0, -0), isEqual('1', 1), isEqual(null, undefined)]).toEqual([true, true, false, false]);
      expect([isEqual(new Date(5), new Date(5)), isEqual(new Date(5), new Date(6)), isEqual(new Date(5), 5)]).toEqual([true, false, false]);
      expect([isEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }), isEqual([1, 2], [2, 1])]).toEqual([true, false]);
    },
  },
  {
    group: G1,
    title: 'isEqual: undefined differs from missing; arrays differ from objects',
    run({ isEqual }, { expect }) {
      expect([isEqual({ a: undefined }, {}), isEqual({}, { a: undefined }), isEqual({ a: undefined }, { a: undefined })]).toEqual([false, false, true]);
      expect([isEqual([], {}), isEqual({ 0: 'x', length: 1 }, ['x']), isEqual([undefined], [])]).toEqual([false, false, false]);
    },
  },
  {
    group: G2,
    title: 'objects: removes first, then adds and nested changes in b order',
    run({ diff }, { expect }) {
      const a = { keep: 1, gone: true, nested: { x: 1, y: 2 } };
      const b = { added: [1], nested: { x: 1, y: 3 }, keep: 1 };
      expect(diff(a, b)).toEqual([
        { op: 'remove', path: '/gone' },
        { op: 'add', path: '/added', value: [1] },
        { op: 'replace', path: '/nested/y', value: 3 },
      ]);
      expect(diff({ a: [1, { b: NaN }] }, { a: [1, { b: NaN }] })).toEqual([]);
    },
  },
  {
    group: G2,
    title: 'pointer escaping, root replace and kind changes',
    run({ diff }, { expect }) {
      expect(diff({ 'a/b': 1, 'c~d': 1, '': 1 }, { 'a/b': 2, 'c~d': 2, '': 2 }).map((o) => o.path)).toEqual(['/a~1b', '/c~0d', '/']);
      expect(diff(1, [1])).toEqual([{ op: 'replace', path: '', value: [1] }]);
      expect(diff({ v: [1] }, { v: { 0: 1 } })).toEqual([{ op: 'replace', path: '/v', value: { 0: 1 } }]);
      expect(diff({ v: 1 }, { v: undefined })).toEqual([{ op: 'replace', path: '/v', value: undefined }]);
    },
  },
  {
    group: G2,
    title: 'arrays by index: trailing removes go backwards, adds go forwards; values are copies',
    run({ diff }, { expect }) {
      expect(diff([1, 2, 3, 4], [1, 9])).toEqual([
        { op: 'replace', path: '/1', value: 9 },
        { op: 'remove', path: '/3' },
        { op: 'remove', path: '/2' },
      ]);
      const b = { list: [1, { deep: [1] }] };
      const ops = diff({ list: [1] }, b);
      expect(ops).toEqual([{ op: 'add', path: '/list/1', value: { deep: [1] } }]);
      (b.list[1] as any).deep.push(2);
      expect((ops[0] as any).value).toEqual({ deep: [1] });
    },
  },
  {
    group: G3,
    title: 'add / remove / replace including "-" and root',
    run({ applyPatch }, { expect }) {
      const doc = { list: [1, 2], obj: { a: 1 } };
      expect(applyPatch(doc, [
        { op: 'add', path: '/list/-', value: 3 },
        { op: 'add', path: '/list/0', value: 0 },
        { op: 'remove', path: '/obj/a' },
        { op: 'add', path: '/obj/b~1c', value: { n: 1 } },
        { op: 'replace', path: '/list/1', value: 'one' },
      ])).toEqual({ list: [0, 'one', 2, 3], obj: { 'b/c': { n: 1 } } });
      expect(applyPatch(doc, [{ op: 'replace', path: '', value: [1] }])).toEqual([1]);
      expect(applyPatch(doc, [{ op: 'add', path: '', value: 'x' }])).toEqual('x');
    },
  },
  {
    group: G3,
    title: 'move, copy and test',
    run({ applyPatch, PatchError }, { expect }) {
      const doc = { a: { b: [1, 2] }, c: 3 };
      const out = applyPatch(doc, [
        { op: 'test', path: '/a/b', value: [1, 2] },
        { op: 'copy', from: '/a/b', path: '/copy' },
        { op: 'move', from: '/c', path: '/a/b/0' },
        { op: 'move', from: '/a', path: '/a' },
      ]);
      expect(out).toEqual({ a: { b: [3, 1, 2] }, copy: [1, 2] });
      expect((out as any).copy !== (out as any).a.b).toBe(true);
      expect(thrown(() => applyPatch(doc, [{ op: 'move', from: '/a', path: '/a/b/x' }])) instanceof PatchError).toBe(true);
      expect(thrown(() => applyPatch(doc, [{ op: 'test', path: '/c', value: '3' }])) instanceof PatchError).toBe(true);
      expect(applyPatch({ ab: 1, a: { b: 2 } } as any, [{ op: 'move', from: '/a', path: '/ab' }])).toEqual({ ab: { b: 2 } });
    },
  },
  {
    group: G3,
    title: 'invalid paths and indices throw PatchError with the op index',
    run({ applyPatch, PatchError }, { expect }) {
      const doc = { list: [1, 2], obj: {} };
      const bad: any[] = [
        { op: 'remove', path: '/missing' },
        { op: 'add', path: '/nope/x', value: 1 },
        { op: 'replace', path: '/list/2', value: 1 },
        { op: 'add', path: '/list/3', value: 1 },
        { op: 'add', path: '/list/01', value: 1 },
        { op: 'remove', path: '/list/-' },
        { op: 'remove', path: '' },
        { op: 'add', path: 'list', value: 1 },
        { op: 'frobnicate', path: '/obj' },
      ];
      for (const op of bad) {
        let err: any;
        try { applyPatch(doc, [{ op: 'test', path: '/obj', value: {} }, op]); } catch (e) { err = e; }
        expect([err instanceof PatchError, err?.index, err?.operation === op], JSON.stringify(op)).toEqual([true, 1, true]);
      }
    },
  },
  {
    group: G3,
    title: 'applyPatch is immutable and atomic',
    run({ applyPatch }, { expect }) {
      const doc = { list: [{ n: 1 }], keep: { k: 1 } };
      const snapshot = JSON.stringify(doc);
      const value = { fresh: true };
      const out: any = applyPatch(doc, [{ op: 'add', path: '/v', value }, { op: 'replace', path: '/list/0/n', value: 2 }]);
      expect([JSON.stringify(doc), out.v !== value, out.keep !== doc.keep, out.list[0].n]).toEqual([snapshot, true, true, 2]);
      out.v.fresh = false;
      expect(value.fresh).toBe(true);
      expect(() => applyPatch(doc, [{ op: 'replace', path: '/list/0/n', value: 3 }, { op: 'remove', path: '/nope' }])).toThrow();
      expect(JSON.stringify(doc)).toBe(snapshot);
    },
  },
  {
    group: G4,
    title: 'objectHash: a pure reorder is only move ops',
    run({ diff, applyPatch, isEqual }, { expect }) {
      const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, big: [id, id, id] }));
      const shuffled = [items[4], items[0], items[3], items[1], items[2]];
      const ops = diff(items, shuffled, { objectHash: (x: any) => x.id });
      expect(ops.every((o) => o.op === 'move'), JSON.stringify(ops)).toBe(true);
      expect(ops.length <= 4).toBe(true);
      expect(isEqual(applyPatch(items, ops), shuffled)).toBe(true);
    },
  },
  {
    group: G4,
    title: 'objectHash: moved items are diffed in place; new and gone items add/remove',
    run({ diff, applyPatch, isEqual }, { expect }) {
      const a = [{ id: 1, v: 'one' }, { id: 2, v: 'two' }, { id: 3, v: 'three' }];
      const b = [{ id: 3, v: 'THREE' }, { id: 4, v: 'four' }, { id: 1, v: 'one' }];
      const ops = diff(a, b, { objectHash: (x: any) => String(x.id) });
      expect(ops.filter((o) => o.op === 'replace')).toEqual([{ op: 'replace', path: '/0/v', value: 'THREE' }]);
      expect(ops.filter((o) => o.op === 'add')).toEqual([{ op: 'add', path: '/1', value: { id: 4, v: 'four' } }]);
      expect(ops.filter((o) => o.op === 'remove').length).toBe(1);
      expect(isEqual(applyPatch(a, ops), b)).toBe(true);
    },
  },
  {
    group: G4,
    title: 'round-trip property: 300 random pairs with and without objectHash',
    run({ diff, applyPatch, isEqual }, { expect }) {
      const r = rng(42);
      const hash = (x: unknown) => JSON.stringify(x)?.slice(0, 3) ?? 'u';
      for (let i = 0; i < 300; i++) {
        const a = randomValue(r, 0);
        const b = randomValue(r, 0);
        const before = JSON.stringify(a);
        const plain = applyPatch(a, diff(a, b));
        const hashed = applyPatch(a, diff(a, b, { objectHash: hash }));
        if (!isEqual(plain, b) || !isEqual(hashed, b) || JSON.stringify(a) !== before) {
          expect({ a, b, plain, hashed }, `case ${i}`).toEqual({ a, b, plain: b, hashed: b });
        }
      }
      expect(true).toBe(true);
    },
  },
];
