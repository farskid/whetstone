import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Plain data';
const G2 = 'Identity';
const G3 = 'Built-ins';
const G4 = 'Edges';

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'deep copies of nested objects and arrays; primitives pass through',
    run({ clone }, { expect }) {
      const src = { a: 1, b: { c: [1, { d: 'x' }], e: null, u: undefined }, big: 10n, nan: NaN };
      const out = clone(src);
      expect(out).toEqual(src);
      expect([out !== src, out.b !== src.b, out.b.c !== src.b.c, out.b.c[1] !== src.b.c[1], 'u' in out.b]).toEqual([true, true, true, true, true]);
      (out.b.c[1] as any).d = 'changed';
      expect((src.b.c[1] as any).d).toBe('x');
      expect([clone(5), clone('s'), clone(null), clone(undefined), Object.is(clone(-0), -0)]).toEqual([5, 's', null, undefined, true]);
    },
  },
  {
    group: G1,
    title: 'function and symbol values throw TypeError',
    run({ clone }, { expect }) {
      expect(thrown(() => clone({ f() {} })) instanceof TypeError).toBe(true);
      expect(thrown(() => clone([Symbol('s')])) instanceof TypeError).toBe(true);
      expect(thrown(() => clone(new Map([[1, () => 1]]))) instanceof TypeError).toBe(true);
      expect(thrown(() => clone(() => 1)) instanceof TypeError).toBe(true);
    },
  },
  {
    group: G2,
    title: 'cycles and shared references keep their shape',
    run({ clone }, { expect }) {
      const shared = { n: 1 };
      const when = new Date(1);
      const src: any = { a: shared, b: [shared], list: [] as any[], when, dates: [when] };
      src.self = src;
      src.list.push(src.list, src);
      const out = clone(src);
      expect([out.self === out, out.a === out.b[0], out.a !== shared, out.list[0] === out.list, out.list[1] === out, out.dates[0] === out.when]).toEqual([true, true, true, true, true, true]);
    },
  },
  {
    group: G3,
    title: 'Date and RegExp (with lastIndex)',
    run({ clone }, { expect }) {
      const re = /a(b)/gi;
      re.exec('xxab');
      const d = new Date(Date.UTC(2020, 1, 2));
      const out = clone({ d, re });
      expect([out.d instanceof Date, out.d !== d, out.d.getTime()]).toEqual([true, true, d.getTime()]);
      expect([out.re instanceof RegExp, out.re !== re, out.re.source, out.re.flags, out.re.lastIndex]).toEqual([true, true, 'a(b)', 'gi', 4]);
    },
  },
  {
    group: G3,
    title: 'Map and Set keep order and clone object keys and members',
    run({ clone }, { expect }) {
      const key = { id: 1 };
      const member = { m: true };
      const m = new Map<any, any>([['z', 1], [key, { v: 2 }], ['a', key]]);
      const s = new Set<any>([3, member, 1]);
      const out = clone({ m, s, key });
      expect([...out.m.keys()].map((k) => (typeof k === 'string' ? k : 'obj'))).toEqual(['z', 'obj', 'a']);
      const [, [k2, v2], [, a]] = [...out.m];
      expect([k2 !== key, k2 === out.key, k2 === a, v2]).toEqual([true, true, true, { v: 2 }]);
      const members = [...out.s];
      expect([members[0], members[1] !== member, members[1], members[2]]).toEqual([3, true, { m: true }, 1]);
    },
  },
  {
    group: G3,
    title: 'typed arrays and DataView share one cloned buffer',
    run({ clone }, { expect }) {
      const buf = new ArrayBuffer(16);
      const bytes = new Uint8Array(buf, 4, 8);
      const floats = new Float64Array(buf, 8, 1);
      const view = new DataView(buf, 2, 4);
      bytes[0] = 9;
      floats[0] = 1.5;
      const out = clone({ bytes, floats, view, buf });
      expect([out.bytes instanceof Uint8Array, out.floats instanceof Float64Array, out.view instanceof DataView]).toEqual([true, true, true]);
      expect([out.bytes.byteOffset, out.bytes.length, out.floats[0], out.view.byteOffset, out.view.byteLength]).toEqual([4, 8, 1.5, 2, 4]);
      expect([out.bytes.buffer === out.buf, out.floats.buffer === out.buf, out.view.buffer === out.buf, out.buf !== buf]).toEqual([true, true, true, true]);
      out.bytes[0] = 1;
      expect(bytes[0], 'original untouched').toBe(9);
      expect(new Uint8Array(out.buf)[4]).toBe(1);
    },
  },
  {
    group: G4,
    title: 'sparse arrays keep holes; extra array props are copied',
    run({ clone }, { expect }) {
      const arr: any = [1, , 3];
      arr.length = 5;
      arr.label = 'tagged';
      const out = clone(arr);
      expect([out.length, 0 in out, 1 in out, 2 in out, 4 in out, out.label]).toEqual([5, true, false, true, false, 'tagged']);
    },
  },
  {
    group: G4,
    title: 'symbol keys are copied; non-enumerable ones are not',
    run({ clone }, { expect }) {
      const k = Symbol('k');
      const hidden = Symbol('hidden');
      const src: any = { [k]: { deep: 1 } };
      Object.defineProperty(src, hidden, { value: 1, enumerable: false });
      Object.defineProperty(src, 'secret', { value: 2, enumerable: false });
      const out = clone(src);
      expect([out[k], out[k] !== src[k], hidden in out, 'secret' in out]).toEqual([{ deep: 1 }, true, false, false]);
    },
  },
  {
    group: G4,
    title: 'getters become data; class instances become plain unless keepPrototype',
    run({ clone }, { expect }) {
      let reads = 0;
      const src = { get v() { reads++; return { n: reads }; } };
      const out = clone(src);
      const desc = Object.getOwnPropertyDescriptor(out, 'v')!;
      expect([reads, desc.get, desc.value, desc.writable]).toEqual([1, undefined, { n: 1 }, true]);
      class Point { constructor(public x: number, public y: number) {} len() { return Math.hypot(this.x, this.y); } }
      const p = new Point(3, 4);
      const plain = clone(p);
      expect([Object.getPrototypeOf(plain) === Object.prototype, plain]).toEqual([true, { x: 3, y: 4 }]);
      const kept = clone(p, { keepPrototype: true });
      expect([kept instanceof Point, kept !== p, kept.len()]).toEqual([true, true, 5]);
      const bare = Object.assign(Object.create(null), { a: 1 });
      expect(Object.getPrototypeOf(clone(bare))).toBe(null);
    },
  },
  {
    group: G4,
    title: 'customizer replaces objects without traversing them',
    run({ clone }, { expect }) {
      class Handle { constructor(public id: number) {} }
      const h = new Handle(7);
      const seen: unknown[] = [];
      const src = { h, again: h, nested: { arr: [h] } };
      const out = clone(src, { customizer: (v) => { seen.push(v); return v instanceof Handle ? h : undefined; } });
      expect([out.h === h, out.again === h, out.nested.arr[0] === h, out.nested !== src.nested]).toEqual([true, true, true, true]);
      expect(seen.filter((v) => v === h).length, 'memoized after first replacement').toBe(1);
    },
  },
  {
    group: G4,
    title: '100,000 levels deep (objects and arrays) without stack overflow',
    run({ clone }, { expect }) {
      const root: any = {};
      let node = root;
      for (let i = 0; i < 100_000; i++) { node.next = i % 2 ? {} : [{}]; node = Array.isArray(node.next) ? node.next[0] : node.next; }
      let out: any = clone(root);
      let depth = 0;
      while (out.next) { out = Array.isArray(out.next) ? out.next[0] : out.next; depth++; }
      expect(depth).toBe(100_000);
    },
  },
];
