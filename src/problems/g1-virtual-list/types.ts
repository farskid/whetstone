/** One row to render. `end = start + size`. */
export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualizerOptions {
  count: number;
  /** Size of a row that hasn't been measured. */
  estimateSize: (index: number) => number;
  viewportHeight: number;
  /** Extra rows on each side of the visible range. Default 1. */
  overscan?: number;
  /** Space between consecutive rows. Default 0. */
  gap?: number;
}

/** Options for `scrollToIndex`. */
export interface ScrollToIndexOptions {
  /** Where the row lands in the viewport; default `'auto'` (scroll only as far as needed). */
  align?: 'start' | 'center' | 'end' | 'auto';
  /** The current scrollTop; default 0. */
  scrollTop?: number;
}

/** What `createVirtualizer` returns. */
export interface Virtualizer {
  getVirtualItems(scrollTop: number): VirtualItem[];
  getTotalSize(): number;
  /** Replaces the row's size; returns the scroll adjustment for a row above the viewport. */
  measure(index: number, size: number, scrollTop?: number): number;
  /** Returns the scrollTop that brings the row into view. */
  scrollToIndex(index: number, opts?: ScrollToIndexOptions): number;
  setCount(count: number): void;
  setViewportHeight(height: number): void;
}
