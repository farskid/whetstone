import type { VirtualItem, VirtualizerOptions } from './types';

export function createVirtualizer(options: VirtualizerOptions) {
  const { count, viewportHeight: viewport, overscan = 1 } = options;
  const size = count > 0 ? options.estimateSize(0) : 0;
  const total = () => count * size;

  return {
    getVirtualItems(scrollTop: number): VirtualItem[] {
      if (count === 0) return [];
      const top = Math.min(Math.max(0, scrollTop), Math.max(0, total() - viewport));
      const first = Math.min(Math.floor(top / size), count - 1);
      const last = Math.max(first, Math.min(Math.ceil((top + viewport) / size) - 1, count - 1));
      const out: VirtualItem[] = [];
      for (let i = Math.max(0, first - overscan); i <= Math.min(count - 1, last + overscan); i++) {
        out.push({ index: i, start: i * size, size, end: (i + 1) * size });
      }
      return out;
    },

    getTotalSize: total,
  };
}
