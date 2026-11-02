export interface MasonryItem {
  height: number;
}

export interface MasonryOptions {
  containerWidth: number;
  /** Space between columns and below every item. Default 0. */
  gutter?: number;
  /** A positive integer. */
  columnCount: number;
}

/** Where one item landed. `column` is the leftmost column it covers. */
export interface Placed {
  x: number;
  y: number;
  width: number;
  height: number;
  column: number;
}

/** `height` is the tallest column without the trailing gutter, or 0 with no items. */
export interface Layout {
  columnCount: number;
  columnWidth: number;
  positions: Placed[];
  height: number;
}
