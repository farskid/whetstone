/** One row to render. `end = start + size`. */
export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualizerOptions {
  count: number;
  /** Row size. In this stage every row has the same size. */
  estimateSize: (index: number) => number;
  viewportHeight: number;
  /** Extra rows on each side of the visible range. Default 1. */
  overscan?: number;
}
