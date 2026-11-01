/** Give either a fixed height or an aspect ratio (width / height). */
export type MasonryItem = { height: number; span?: number } | { aspectRatio: number; span?: number };

export interface MasonryOptions {
  containerWidth: number;
  gutter?: number;
  /** Exactly one of columnCount and minColumnWidth must be given. */
  columnCount?: number;
  minColumnWidth?: number;
}

export interface Placed {
  x: number;
  y: number;
  width: number;
  height: number;
  column: number;
  span: number;
}

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

export function layout(items: MasonryItem[], options: MasonryOptions): Layout {
  throw new Error('Not implemented');
}

export function createMasonry(options: MasonryOptions): Masonry {
  throw new Error('Not implemented');
}
