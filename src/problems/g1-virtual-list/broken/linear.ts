// Broken: recomputes every start offset on each call (O(n)), excludes the
// row that is only partially visible at the top, and ignores gap.
import type { VirtualItem, VirtualizerOptions } from '../types';
export type { VirtualItem, VirtualizerOptions } from '../types';

export function createVirtualizer(o: VirtualizerOptions) {
  let count = o.count;
  let h = o.viewportHeight;
  const overscan = o.overscan ?? 1;
  const measured = new Map<number, number>();
  const size = (i: number) => measured.get(i) ?? o.estimateSize(i);
  const starts = () => { const s: number[] = []; let y = 0; for (let i = 0; i < count; i++) { s.push(y); y += size(i); } return { s, total: y }; };
  return {
    getVirtualItems(top: number): VirtualItem[] {
      const { s } = starts();
      const out: VirtualItem[] = [];
      for (let i = 0; i < count; i++) if (s[i] >= top && s[i] < top + h) out.push({ index: i, start: s[i], size: size(i), end: s[i] + size(i) });
      if (!out.length) return out;
      const first = Math.max(0, out[0].index - overscan), last = Math.min(count - 1, out[out.length - 1].index + overscan);
      return Array.from({ length: last - first + 1 }, (_, k) => ({ index: first + k, start: s[first + k], size: size(first + k), end: s[first + k] + size(first + k) }));
    },
    getTotalSize: () => starts().total,
    measure(i: number, sz: number, top = 0) { const d = sz - size(i); const above = starts().s[i] < top; measured.set(i, sz); return above ? d : 0; },
    scrollToIndex(i: number, opts: { align?: string; scrollTop?: number } = {}) { return starts().s[Math.min(i, count - 1)] ?? 0; },
    setCount(n: number) { count = n; },
    setViewportHeight(n: number) { h = n; },
  };
}
