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

/** What `createVirtualizer` returns. */
export interface Virtualizer {
  getVirtualItems(scrollTop: number): VirtualItem[];
  getTotalSize(): number;
  /** Replaces the row's estimated size. */
  measure(index: number, size: number): void;
}
