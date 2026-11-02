import type { TestCase } from '../../runner/types';
import type { MasonryItem, Placed } from './types';
type M = typeof import('./solution');

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

const h = (...hs: number[]): MasonryItem[] => hs.map((height) => ({ height }));
const cols = (ps: Placed[]) => ps.map((p) => p.column);
const ys = (ps: Placed[]) => ps.map((p) => p.y);

function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

export const tests: TestCase<M>[] = [
  {
    group: 'Shortest column',
    title: 'each item goes to the shortest column, leftmost on ties',
    input: '3 columns, 300 wide, no gutter; heights 100 50 80 30 60 40',
    run({ layout }, { expect }) {
      const r = layout(h(100, 50, 80, 30, 60, 40), { containerWidth: 300, columnCount: 3 });
      expect(r.columnWidth).toBe(100);
      expect(cols(r.positions)).toEqual([0, 1, 2, 1, 1, 2]);
      expect(ys(r.positions)).toEqual([0, 0, 0, 50, 80, 80]);
      expect(r.positions.map((p) => p.x)).toEqual([0, 100, 200, 100, 100, 200]);
      expect(r.height).toBe(140);
    },
  },
  {
    group: 'Shortest column',
    title: 'gutters sit between columns and below items',
    run({ layout }, { expect }) {
      const r = layout(h(40, 40, 40, 10), { containerWidth: 320, columnCount: 3, gutter: 10 });
      expect(r.columnWidth).toBe(100);
      expect(r.positions.map((p) => p.x)).toEqual([0, 110, 220, 0]);
      expect(r.positions[3].y).toBe(50);
      expect(r.positions[3].width).toBe(100);
      expect(r.height, 'no trailing gutter').toBe(60);
      expect(layout([], { containerWidth: 320, columnCount: 3, gutter: 10 }).height).toBe(0);
    },
  },
  {
    group: 'Shortest column',
    title: 'x is computed per column, not accumulated',
    run({ layout }, { expect }) {
      const r = layout(h(1, 1, 1, 1, 1, 1, 1), { containerWidth: 1000, columnCount: 7, gutter: 3 });
      const w = (1000 - 18) / 7;
      expect(r.columnWidth).toBeCloseTo(w, 9);
      r.positions.forEach((p, c) => expect(p.x, `column ${c}`).toBeCloseTo(c * (w + 3), 9));
      expect(r.positions[6].x + r.positions[6].width, 'the last column ends at the container edge').toBeCloseTo(1000, 9);
    },
  },
  {
    group: 'Responsive columns',
    title: 'minColumnWidth decides the column count',
    run({ layout }, { expect }) {
      const opts = (containerWidth: number) => ({ containerWidth, minColumnWidth: 200, gutter: 20 });
      expect(layout([], opts(660)).columnCount, '3 × 200 + 2 × 20 = 640 fits').toBe(3);
      expect(layout([], opts(659)).columnCount).toBe(3);
      expect(layout([], opts(639)).columnCount).toBe(2);
      expect(layout([], opts(880)).columnCount, 'exactly 4 × 200 + 3 × 20').toBe(4);
      expect(layout([], opts(150)).columnCount, 'always at least one').toBe(1);
      expect(layout([], opts(150)).columnWidth).toBe(150);
    },
  },
  {
    group: 'Responsive columns',
    title: 'aspect ratios scale with the column width',
    run({ layout }, { expect }) {
      const r = layout([{ aspectRatio: 2 }, { aspectRatio: 0.5 }, { aspectRatio: 1 }], { containerWidth: 410, columnCount: 2, gutter: 10 });
      expect(r.positions.map((p) => p.height), 'columns are 200 wide').toEqual([100, 400, 200]);
      expect(r.positions[2].y).toBe(110);
      expect(r.height).toBe(400);
    },
  },
  {
    group: 'Responsive columns',
    title: 'options and items are validated',
    run({ layout }, { expect }) {
      expect(thrown(() => layout([], { containerWidth: 100 }))).toBeInstanceOf(TypeError);
      expect(thrown(() => layout([], { containerWidth: 100, columnCount: 2, minColumnWidth: 50 }))).toBeInstanceOf(TypeError);
      expect(thrown(() => layout([], { containerWidth: 100, columnCount: 0 }))).toBeInstanceOf(RangeError);
      expect(thrown(() => layout([], { containerWidth: 100, columnCount: 1.5 }))).toBeInstanceOf(RangeError);
      expect(thrown(() => layout([], { containerWidth: 100, minColumnWidth: 0 }))).toBeInstanceOf(RangeError);
      expect(thrown(() => layout([], { containerWidth: -1, columnCount: 2 }))).toBeInstanceOf(RangeError);
      expect(thrown(() => layout(h(-5), { containerWidth: 100, columnCount: 2 }))).toBeInstanceOf(RangeError);
      expect(thrown(() => layout([{ aspectRatio: 0 }], { containerWidth: 100, columnCount: 2 }))).toBeInstanceOf(RangeError);
    },
  },
  {
    group: 'Spans',
    title: 'a wide item sits on the lowest run of adjacent columns',
    input: '4 columns of 100; heights 10 80 20 30, then a 2-wide item',
    run({ layout }, { expect }) {
      const r = layout([...h(10, 80, 20, 30), { height: 50, span: 2 }, { height: 5 }], { containerWidth: 400, columnCount: 4 });
      const wide = r.positions[4];
      expect(wide.column, 'runs: 0–1 → 80, 1–2 → 80, 2–3 → 30').toBe(2);
      expect(wide.y).toBe(30);
      expect(wide.width).toBe(200);
      expect(wide.span).toBe(2);
      expect(r.positions[5].column).toBe(0);
      expect(r.positions[5].y).toBe(10);
      expect(r.height).toBe(80);
      const ar = layout([{ aspectRatio: 2 }, { aspectRatio: 0.5 }, { aspectRatio: 1 }, { aspectRatio: 2, span: 2 }], { containerWidth: 410, columnCount: 2, gutter: 10 });
      expect(ar.positions.map((p) => p.height), 'the wide item is 410 wide').toEqual([100, 400, 200, 205]);
      expect(ar.positions[3].y).toBe(410);
      expect(ar.height).toBe(615);
    },
  },
  {
    group: 'Spans',
    title: 'ties pick the leftmost run; spans are capped',
    run({ layout }, { expect }) {
      const r = layout([...h(40, 10, 10, 40), { height: 20, span: 2 }, { height: 20, span: 9 }], { containerWidth: 430, columnCount: 4, gutter: 10 });
      expect(r.positions[4].column).toBe(1);
      expect(r.positions[4].y).toBe(20);
      expect(r.positions[4].width).toBe(210);
      const full = r.positions[5];
      expect([full.column, full.span, full.width, full.x]).toEqual([0, 4, 430, 0]);
      expect(full.y, 'below everything: columns end at 50, 50, 50, 50').toBe(50);
      expect(r.height).toBe(70);
      expect(thrown(() => layout([{ height: 5, span: 0 }], { containerWidth: 100, columnCount: 2 })), 'bad span').toBeInstanceOf(RangeError);
    },
  },
  {
    group: 'Incremental',
    title: 'append keeps placed items and matches a full layout',
    run({ layout, createMasonry }, { expect }) {
      const opts = { containerWidth: 620, columnCount: 3, gutter: 10 };
      const m = createMasonry(opts);
      const first = m.append(h(100, 30, 60));
      const before = JSON.stringify(m.layout.positions);
      const more = m.append([{ height: 20, span: 2 }, ...h(50)]);
      expect(more).toHaveLength(2);
      expect(JSON.stringify(m.layout.positions.slice(0, 3))).toBe(before);
      expect(first[1].y).toBe(0);
      expect(m.layout).toEqual(layout([...h(100, 30, 60), { height: 20, span: 2 }, ...h(50)], opts));
    },
  },
  {
    group: 'Incremental',
    title: 'resize lays everything out again',
    run({ layout, createMasonry }, { expect }) {
      const items = h(100, 30, 60, 40, 90);
      const m = createMasonry({ containerWidth: 300, minColumnWidth: 100 });
      m.append(items);
      expect(m.layout.columnCount).toBe(3);
      const r = m.resize(200);
      expect(r.columnCount).toBe(2);
      expect(r).toEqual(layout(items, { containerWidth: 200, minColumnWidth: 100 }));
      expect(m.layout).toEqual(r);
      m.append(h(10));
      expect(m.layout, 'append after resize uses the new columns').toEqual(layout([...items, ...h(10)], { containerWidth: 200, minColumnWidth: 100 }));
    },
  },
  {
    group: 'Incremental',
    title: 'random layouts: no overlaps, inside the container, append = layout',
    input: '40 seeded random layouts',
    run({ layout, createMasonry }, { expect }) {
      const rand = rng(7);
      for (let t = 0; t < 40; t++) {
        const columnCount = 1 + Math.floor(rand() * 5);
        const opts = { containerWidth: 300 + Math.floor(rand() * 700), columnCount, gutter: Math.floor(rand() * 3) * 8 };
        const items: MasonryItem[] = Array.from({ length: 1 + Math.floor(rand() * 15) }, () =>
          rand() < 0.3 ? { aspectRatio: 0.5 + rand() * 2, span: 1 + Math.floor(rand() * 3) } : { height: Math.floor(rand() * 200), span: 1 + Math.floor(rand() * 3) },
        );
        const r = layout(items, opts);
        const ps = r.positions;
        for (let i = 0; i < ps.length; i++) {
          expect(ps[i].x + ps[i].width <= opts.containerWidth + 1e-6, `case ${t} item ${i} fits`).toBe(true);
          expect(ps[i].y + ps[i].height <= r.height + 1e-6, `case ${t} item ${i} under the total height`).toBe(true);
          for (let j = 0; j < i; j++) {
            const a = ps[i], b = ps[j];
            const overlapX = a.x < b.x + b.width - 1e-6 && b.x < a.x + a.width - 1e-6;
            const overlapY = a.y < b.y + b.height - 1e-6 && b.y < a.y + a.height - 1e-6;
            expect(overlapX && overlapY, `case ${t}: items ${j} and ${i} overlap`).toBe(false);
          }
        }
        const m = createMasonry(opts);
        const cut = Math.floor(items.length / 2);
        m.append(items.slice(0, cut));
        m.append(items.slice(cut));
        expect(m.layout, `case ${t}`).toEqual(r);
      }
    },
  },
];
