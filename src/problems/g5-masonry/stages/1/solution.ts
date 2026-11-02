import type { MasonryItem, MasonryOptions, Placed, Layout } from './types';

function columnsFor(o: MasonryOptions): { count: number; width: number; gutter: number } {
  const gutter = o.gutter ?? 0;
  if (!(o.containerWidth >= 0) || !(gutter >= 0)) throw new RangeError('containerWidth and gutter must be non-negative');
  if (!Number.isInteger(o.columnCount) || o.columnCount < 1) throw new RangeError('columnCount must be a positive integer');
  const count = o.columnCount;
  const width = Math.max(0, (o.containerWidth - gutter * (count - 1)) / count);
  return { count, width, gutter };
}

function engine(options: MasonryOptions) {
  const cols = columnsFor(options);
  const heights: number[] = new Array(cols.count).fill(0);
  const positions: Placed[] = [];

  function place(item: MasonryItem): Placed {
    const width = cols.width;
    const height = item.height;
    if (!(height >= 0) || !Number.isFinite(height)) throw new RangeError('item height must be a non-negative number');
    let column = 0;
    for (let c = 1; c < cols.count; c++) if (heights[c] < heights[column]) column = c;
    const top = heights[column];
    heights[column] = top + height + cols.gutter;
    const p = { x: column * (cols.width + cols.gutter), y: top, width, height, column };
    positions.push(p);
    return p;
  }

  return {
    place,
    snapshot(): Layout {
      return {
        columnCount: cols.count,
        columnWidth: cols.width,
        positions: positions.slice(),
        height: positions.length ? Math.max(...heights) - cols.gutter : 0,
      };
    },
  };
}

export function layout(items: MasonryItem[], options: MasonryOptions): Layout {
  const e = engine(options);
  items.forEach(e.place);
  return e.snapshot();
}
