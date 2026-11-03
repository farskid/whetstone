import type { VirtualItem, VirtualizerOptions, Virtualizer, ScrollToIndexOptions } from './types';

export function createVirtualizer(options: VirtualizerOptions): Virtualizer {
  return {
    getVirtualItems(scrollTop: number): VirtualItem[] {
      throw new Error('Not implemented');
    },
    getTotalSize(): number {
      throw new Error('Not implemented');
    },
    measure(index: number, size: number, scrollTop = 0): number {
      throw new Error('Not implemented');
    },
    scrollToIndex(index: number, opts: ScrollToIndexOptions = {}): number {
      throw new Error('Not implemented');
    },
    setCount(count: number): void {
      throw new Error('Not implemented');
    },
    setViewportHeight(height: number): void {
      throw new Error('Not implemented');
    },
  };
}
