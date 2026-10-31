import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const idx = (items: { index: number }[]) => items.map((i) => i.index);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const tests: TestCase<M>[] = [
  {
    title: 'fixed size: visible rows, positions and total',
    input: '1000 rows × 50px, viewport 200, overscan 0, scrollTop 0',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 1000, estimateSize: () => 50, viewportHeight: 200, overscan: 0 });
      expect(v.getVirtualItems(0)).toEqual([
        { index: 0, start: 0, size: 50, end: 50 },
        { index: 1, start: 50, size: 50, end: 100 },
        { index: 2, start: 100, size: 50, end: 150 },
        { index: 3, start: 150, size: 50, end: 200 },
      ]);
      expect(v.getTotalSize()).toBe(50_000);
    },
  },
  {
    title: 'partially visible rows at both edges count as visible',
    input: 'scrollTop 75 → rows 1 (75..100 visible) through 5 (250..275)',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 1000, estimateSize: () => 50, viewportHeight: 200, overscan: 0 });
      expect(idx(v.getVirtualItems(75))).toEqual([1, 2, 3, 4, 5]);
      expect(idx(v.getVirtualItems(100)), 'row 1 ends exactly at 100: not visible').toEqual([2, 3, 4, 5]);
    },
  },
  {
    title: 'overscan adds rows on each side, clamped to the list',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 1000, estimateSize: () => 50, viewportHeight: 200, overscan: 3 });
      expect(idx(v.getVirtualItems(500))).toEqual(range(7, 16));
      expect(idx(v.getVirtualItems(0))).toEqual(range(0, 6));
      const dflt = createVirtualizer({ count: 1000, estimateSize: () => 50, viewportHeight: 200 });
      expect(idx(dflt.getVirtualItems(500)), 'default overscan 1').toEqual(range(9, 14));
    },
  },
  {
    title: 'scrollTop is clamped to the scrollable range',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 10, estimateSize: () => 50, viewportHeight: 200, overscan: 0 });
      expect(idx(v.getVirtualItems(-300))).toEqual([0, 1, 2, 3]);
      expect(idx(v.getVirtualItems(99999))).toEqual([6, 7, 8, 9]);
    },
  },
  {
    title: 'empty and short lists',
    run({ createVirtualizer }, { expect }) {
      const empty = createVirtualizer({ count: 0, estimateSize: () => 50, viewportHeight: 200 });
      expect(empty.getVirtualItems(0)).toEqual([]);
      expect(empty.getTotalSize()).toBe(0);
      expect(empty.scrollToIndex(5, { align: 'start' })).toBe(0);
      const short = createVirtualizer({ count: 2, estimateSize: () => 50, viewportHeight: 200 });
      expect(idx(short.getVirtualItems(40))).toEqual([0, 1]);
    },
  },
  {
    title: 'variable estimated sizes',
    input: 'size(i) = 20 + (i % 3) * 10 → 20, 30, 40, 20, 30, 40 …',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 300, estimateSize: (i) => 20 + (i % 3) * 10, viewportHeight: 100, overscan: 0 });
      expect(v.getTotalSize()).toBe(100 * 90);
      // starts: 0,20,50,90,110,140,180,...
      expect(v.getVirtualItems(95)).toEqual([
        { index: 3, start: 90, size: 20, end: 110 },
        { index: 4, start: 110, size: 30, end: 140 },
        { index: 5, start: 140, size: 40, end: 180 },
        { index: 6, start: 180, size: 20, end: 200 },
      ]);
    },
  },
  {
    title: 'gap between rows (and a scrollTop that lands in a gap)',
    input: 'rows 50px, gap 10 → starts 0, 60, 120 …',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 100, estimateSize: () => 50, viewportHeight: 100, overscan: 0, gap: 10 });
      expect(v.getTotalSize()).toBe(100 * 60 - 10);
      expect(v.getVirtualItems(0).map((i) => i.start)).toEqual([0, 60]);
      expect(idx(v.getVirtualItems(55)), 'in the gap after row 0').toEqual([1, 2]);
      expect(idx(v.getVirtualItems(60))).toEqual([1, 2]);
    },
  },
  {
    title: 'measure() replaces the estimate and shifts later rows',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 100, estimateSize: () => 50, viewportHeight: 200, overscan: 0 });
      v.measure(1, 120);
      expect(v.getVirtualItems(0)).toEqual([
        { index: 0, start: 0, size: 50, end: 50 },
        { index: 1, start: 50, size: 120, end: 170 },
        { index: 2, start: 170, size: 50, end: 220 },
      ]);
      expect(v.getTotalSize()).toBe(5000 + 70);
      v.measure(1, 120);
      expect(v.getTotalSize(), 'measuring the same size twice is a no-op').toBe(5070);
    },
  },
  {
    title: 'measure() returns a scroll adjustment only for rows starting above the viewport',
    input: 'scrollTop 500 (row 10 at top)',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 100, estimateSize: () => 50, viewportHeight: 200, overscan: 0 });
      expect(v.measure(3, 80, 500), 'row 3 above: content shifts down by 30').toBe(30);
      expect(v.measure(12, 80, 530), 'row 12 visible').toBe(0);
      expect(v.measure(9, 30, 530), 'row 9 starts above, shrinks by 20').toBe(-20);
      expect(v.measure(10, 70, 510), 'row 10 starts exactly at the top: not above').toBe(0);
    },
  },
  {
    title: 'scrollToIndex: start / end / center',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 100, estimateSize: () => 50, viewportHeight: 200 });
      expect(v.scrollToIndex(10, { align: 'start' })).toBe(500);
      expect(v.scrollToIndex(10, { align: 'end' })).toBe(350);
      expect(v.scrollToIndex(10, { align: 'center' })).toBe(425);
      expect(v.scrollToIndex(0, { align: 'center' }), 'clamped at the top').toBe(0);
      expect(v.scrollToIndex(99, { align: 'start' }), 'clamped at the bottom').toBe(4800);
      expect(v.scrollToIndex(5000, { align: 'start' }), 'index clamped').toBe(4800);
    },
  },
  {
    title: 'scrollToIndex auto: only scrolls if needed, by the minimum amount',
    input: 'viewport 200 at scrollTop 500 shows rows 10..13',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 100, estimateSize: () => 50, viewportHeight: 200 });
      expect(v.scrollToIndex(12, { scrollTop: 500 }), 'already visible').toBe(500);
      expect(v.scrollToIndex(13, { scrollTop: 500 }), 'last fully visible row').toBe(500);
      expect(v.scrollToIndex(14, { scrollTop: 500 }), 'below → align end').toBe(550);
      expect(v.scrollToIndex(4, { scrollTop: 500 }), 'above → align start').toBe(200);
      expect(v.scrollToIndex(10, { scrollTop: 510 }), 'partially hidden at top').toBe(500);
    },
  },
  {
    title: 'scrollToIndex uses measured sizes',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 100, estimateSize: () => 50, viewportHeight: 200 });
      v.measure(0, 300);
      expect(v.scrollToIndex(1, { align: 'start' })).toBe(300);
      expect(v.scrollToIndex(0, { align: 'end' }), 'taller than the viewport').toBe(100);
    },
  },
  {
    title: 'setCount keeps measurements; setViewportHeight changes the range',
    run({ createVirtualizer }, { expect }) {
      const v = createVirtualizer({ count: 10, estimateSize: () => 50, viewportHeight: 200, overscan: 0 });
      v.measure(2, 100);
      v.setCount(20);
      expect(v.getTotalSize()).toBe(20 * 50 + 50);
      expect(v.getVirtualItems(0)[2]).toEqual({ index: 2, start: 100, size: 100, end: 200 });
      v.setCount(2);
      expect(v.getTotalSize()).toBe(100);
      v.setCount(10);
      expect(v.getTotalSize(), 'row 2 is new again → estimate').toBe(500);
      v.setViewportHeight(400);
      expect(idx(v.getVirtualItems(0))).toEqual(range(0, 7));
    },
  },
  {
    title: 'getVirtualItems matches a brute-force reference on random sizes',
    input: '500 random sizes 1..100, gap 3, overscan 2, 300 random scroll positions',
    run({ createVirtualizer }, { expect }) {
      let seed = 7;
      const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
      const est = Array.from({ length: 500 }, () => 1 + Math.floor(rnd() * 100));
      const v = createVirtualizer({ count: 500, estimateSize: (i) => est[i], viewportHeight: 300, overscan: 2, gap: 3 });
      const real = est.slice();
      for (let k = 0; k < 100; k++) { const i = Math.floor(rnd() * 500); real[i] = 1 + Math.floor(rnd() * 200); v.measure(i, real[i]); }
      const starts: number[] = [];
      let s = 0;
      for (const size of real) { starts.push(s); s += size + 3; }
      const total = s - 3;
      expect(v.getTotalSize()).toBe(total);
      for (let k = 0; k < 300; k++) {
        const y = Math.min(Math.floor(rnd() * total), total - 300);
        const vis = real.map((size, i) => i).filter((i) => starts[i] + real[i] > y && starts[i] < y + 300);
        const want = range(Math.max(0, vis[0] - 2), Math.min(499, vis[vis.length - 1] + 2));
        const got = v.getVirtualItems(y);
        expect(idx(got), `scrollTop ${y}`).toEqual(want);
        expect(got[0].start, `start of row ${want[0]}`).toBe(starts[want[0]]);
      }
    },
  },
  {
    title: '100k rows: interleaved measure + getVirtualItems stay fast',
    input: '100,000 rows; 5,000 × (measure a random row, then getVirtualItems)',
    run({ createVirtualizer }, { expect }) {
      const N = 100_000;
      const v = createVirtualizer({ count: N, estimateSize: () => 40, viewportHeight: 800, overscan: 5 });
      let seed = 1;
      const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
      const t0 = Date.now();
      let y = 0;
      for (let k = 0; k < 5000; k++) {
        y += v.measure(Math.floor(rnd() * N), 20 + Math.floor(rnd() * 80), y);
        y = (y + 997) % (N * 30);
        v.getVirtualItems(y);
        v.getTotalSize();
        if (Date.now() - t0 > 400) break; // already too slow; don't hang the run
      }
      const ms = Date.now() - t0;
      expect(v.getVirtualItems(0)[0].index).toBe(0);
      expect(ms, 'ms (an O(n) recompute per call is far slower)').toBeLessThan(400);
    },
  },
];
