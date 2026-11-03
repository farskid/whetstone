import type { VirtualItem, VirtualizerOptions, Virtualizer, ScrollToIndexOptions } from './types';

/** Fenwick tree over (size + gap) per row: prefix(i) = start(i). */
class Fenwick {
  private tree: Float64Array;
  constructor(values: ArrayLike<number>) {
    const n = values.length;
    this.tree = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) this.tree[i + 1] = values[i];
    for (let i = 1; i <= n; i++) {
      const j = i + (i & -i);
      if (j <= n) this.tree[j] += this.tree[i];
    }
  }
  get length() { return this.tree.length - 1; }
  add(i: number, delta: number) {
    for (let x = i + 1; x < this.tree.length; x += x & -x) this.tree[x] += delta;
  }
  /** Sum of the first i values. */
  prefix(i: number) {
    let s = 0;
    for (let x = i; x > 0; x -= x & -x) s += this.tree[x];
    return s;
  }
  /** Largest p in [0, n] whose prefix(p) satisfies ok (ok must be monotone: true then false). */
  maxPrefix(ok: (sum: number) => boolean) {
    let pos = 0;
    let sum = 0;
    let step = 1;
    while (step * 2 <= this.length) step *= 2;
    for (; step > 0; step >>= 1) {
      const next = pos + step;
      if (next <= this.length && ok(sum + this.tree[next])) { pos = next; sum += this.tree[next]; }
    }
    return pos;
  }
}

export function createVirtualizer(options: VirtualizerOptions): Virtualizer {
  const { estimateSize, overscan = 1, gap = 0 } = options;
  let count = options.count;
  let viewport = options.viewportHeight;
  const measured = new Map<number, number>();
  let sizes = new Float64Array(0);
  let fw = new Fenwick([]);

  const rebuild = () => {
    sizes = new Float64Array(count);
    const withGap = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      sizes[i] = measured.get(i) ?? estimateSize(i);
      withGap[i] = sizes[i] + gap;
    }
    fw = new Fenwick(withGap);
  };
  rebuild();

  const start = (i: number) => fw.prefix(i);
  const total = () => (count === 0 ? 0 : start(count - 1) + sizes[count - 1]);
  const maxScroll = () => Math.max(0, total() - viewport);
  const clampScroll = (y: number) => Math.min(Math.max(0, y), maxScroll());
  const item = (i: number): VirtualItem => {
    const s = start(i);
    return { index: i, start: s, size: sizes[i], end: s + sizes[i] };
  };

  return {
    getVirtualItems(scrollTop: number): VirtualItem[] {
      if (count === 0) return [];
      const top = clampScroll(scrollTop);
      const bottom = top + viewport;
      let first = Math.min(fw.maxPrefix((s) => s <= top), count - 1);
      // `first` starts at or before `top`; if it ends there (or we're in the gap after it), move on.
      while (first < count - 1 && start(first) + sizes[first] <= top) first++;
      let last = Math.min(fw.maxPrefix((s) => s < bottom), count - 1);
      if (last < first) last = first;
      const from = Math.max(0, first - overscan);
      const to = Math.min(count - 1, last + overscan);
      const out: VirtualItem[] = [];
      let s = start(from);
      for (let i = from; i <= to; i++) {
        out.push({ index: i, start: s, size: sizes[i], end: s + sizes[i] });
        s += sizes[i] + gap;
      }
      return out;
    },

    getTotalSize: total,

    measure(index: number, size: number, scrollTop = 0): number {
      if (index < 0 || index >= count) return 0;
      const delta = size - sizes[index];
      measured.set(index, size);
      if (delta === 0) return 0;
      const wasAbove = start(index) < scrollTop;
      sizes[index] = size;
      fw.add(index, delta);
      return wasAbove ? delta : 0;
    },

    scrollToIndex(index: number, opts: ScrollToIndexOptions = {}): number {
      const { align = 'auto', scrollTop = 0 } = opts;
      if (count === 0) return 0;
      const it = item(Math.min(Math.max(0, index), count - 1));
      const target = (() => {
        switch (align) {
          case 'start': return it.start;
          case 'end': return it.end - viewport;
          case 'center': return it.start + it.size / 2 - viewport / 2;
          default:
            if (it.start >= scrollTop && it.end <= scrollTop + viewport) return scrollTop;
            return it.start < scrollTop ? it.start : it.end - viewport;
        }
      })();
      return clampScroll(target);
    },

    setCount(next: number): void {
      for (const k of measured.keys()) if (k >= next) measured.delete(k);
      count = next;
      rebuild();
    },

    setViewportHeight(height: number): void {
      viewport = height;
    },
  };
}
