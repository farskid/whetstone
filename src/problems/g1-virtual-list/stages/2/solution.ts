import type { VirtualItem, VirtualizerOptions } from './types';

export function createVirtualizer(options: VirtualizerOptions) {
  const { count, viewportHeight: viewport, overscan = 1, gap = 0 } = options;
  const sizes = Array.from({ length: count }, (_, i) => options.estimateSize(i));

  // Recomputed on every call: fine for this stage's list sizes.
  const starts = () => {
    const out: number[] = [];
    let s = 0;
    for (const size of sizes) { out.push(s); s += size + gap; }
    return out;
  };
  const total = () => (count === 0 ? 0 : starts()[count - 1] + sizes[count - 1]);
  const clampScroll = (y: number) => Math.min(Math.max(0, y), Math.max(0, total() - viewport));

  return {
    getVirtualItems(scrollTop: number): VirtualItem[] {
      if (count === 0) return [];
      const st = starts();
      const top = clampScroll(scrollTop);
      const bottom = top + viewport;
      let first = 0;
      while (first < count - 1 && st[first] + sizes[first] <= top) first++;
      let last = first;
      while (last < count - 1 && st[last + 1] < bottom) last++;
      const out: VirtualItem[] = [];
      for (let i = Math.max(0, first - overscan); i <= Math.min(count - 1, last + overscan); i++) {
        out.push({ index: i, start: st[i], size: sizes[i], end: st[i] + sizes[i] });
      }
      return out;
    },

    getTotalSize: total,

    measure(index: number, size: number): void {
      if (index >= 0 && index < count) sizes[index] = size;
    },
  };
}
