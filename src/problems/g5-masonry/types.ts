/** Give either a fixed height or an aspect ratio (width / height). */
export type MasonryItem = { height: number; span?: number } | { aspectRatio: number; span?: number };

export interface MasonryOptions {
  containerWidth: number;
  /** Space between columns and below every item. Default 0. */
  gutter?: number;
  /** Exactly one of columnCount and minColumnWidth must be given. */
  columnCount?: number;
  minColumnWidth?: number;
}

/** Where one item landed. `column` is the leftmost column it covers. */
export interface Placed {
  x: number;
  y: number;
  width: number;
  height: number;
  column: number;
  span: number;
}

/** `height` is the tallest column without the trailing gutter, or 0 with no items. */
export interface Layout {
  columnCount: number;
  columnWidth: number;
  positions: Placed[];
  height: number;
}

export interface Masonry {
  readonly layout: Layout;
  /** Places more items below the existing ones and returns their positions. */
  append(items: MasonryItem[]): Placed[];
  /** Lays every item out again for a new container width. */
  resize(containerWidth: number): Layout;
}
