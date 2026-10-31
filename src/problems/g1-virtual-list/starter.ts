export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualizerOptions {
  count: number;
  estimateSize: (index: number) => number;
  viewportHeight: number;
  overscan?: number;
  gap?: number;
}

export function createVirtualizer(options: VirtualizerOptions) {
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
    scrollToIndex(index: number, opts: { align?: 'start' | 'center' | 'end' | 'auto'; scrollTop?: number } = {}): number {
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
