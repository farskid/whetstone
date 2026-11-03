# Virtual list

Implement the layout engine behind **TanStack Virtual** or **react-window**. Rendering stays out of it, so this is pure math. Given row sizes and the scroll position, decide which rows to render and where.

This stage handles a list where every row has the same height.

```ts
const v = createVirtualizer({ count: 1000, estimateSize: () => 50, viewportHeight: 200, overscan: 0 });
v.getVirtualItems(75);  // rows 1..5 → [{ index: 1, start: 50, size: 50, end: 100 }, ...]
v.getTotalSize();       // 50000
```

## API

```ts
interface VirtualItem { index: number; start: number; size: number; end: number } // end = start + size

function createVirtualizer(options: {
  count: number;
  estimateSize: (index: number) => number; // returns the same size for every row in this stage
  viewportHeight: number;
  overscan?: number;  // default 1, extra rows on EACH side of the visible range
}): Virtualizer;

interface Virtualizer {
  getVirtualItems(scrollTop: number): VirtualItem[];
  getTotalSize(): number;
}
```

## Rules

**Layout**
- Every row has size `estimateSize(0)`. Row `i` starts at `i * size`. <!-- tests: fixed size: visible rows, positions and total -->
- `getTotalSize()` is `count * size`, or `0` when the list is empty. <!-- tests: fixed size: visible rows, positions and total -->

**Visible range** for a given `scrollTop`:
- The visible rows are every row that overlaps `[scrollTop, scrollTop + viewportHeight)`, meaning `end > scrollTop` and `start < scrollTop + viewportHeight`. A row that ends exactly at `scrollTop` is not visible. <!-- tests: partially visible rows at both edges count as visible -->
- Add `overscan` rows before and after, clamped to `[0, count - 1]`. <!-- tests: overscan adds rows on each side, clamped to the list -->
- `scrollTop` beyond either end is clamped to `[0, max(0, total - viewportHeight)]` first. <!-- tests: scrollTop is clamped to the scrollable range -->
- Return the rows in index order, or `[]` when `count` is 0. A list shorter than the viewport returns all its rows. <!-- tests: empty and short lists -->
