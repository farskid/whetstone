# Virtual list

Implement the layout engine behind **TanStack Virtual** or **react-window**. Rendering stays out of it, so this is pure math. Given row sizes and the scroll position, decide which rows to render and where.

```ts
const v = createVirtualizer({ count: 100_000, estimateSize: () => 40, viewportHeight: 400, overscan: 2 });
v.getVirtualItems(1000);  // rows 23..37 → [{ index, start, size, end }, ...]
v.measure(30, 87, 1000);  // the real DOM height came in → returns a scroll adjustment
v.scrollToIndex(500, { align: 'center', scrollTop: 1000 }); // → scrollTop to set
```

## API

```ts
interface VirtualItem { index: number; start: number; size: number; end: number } // end = start + size

function createVirtualizer(options: {
  count: number;
  estimateSize: (index: number) => number;
  viewportHeight: number;
  overscan?: number;  // default 1, extra rows on EACH side of the visible range
  gap?: number;       // default 0, space between consecutive rows
}): {
  getVirtualItems(scrollTop: number): VirtualItem[];
  getTotalSize(): number;
  measure(index: number, size: number, scrollTop?: number): number;
  scrollToIndex(index: number, opts?: { align?: 'start' | 'center' | 'end' | 'auto'; scrollTop?: number }): number;
  setCount(count: number): void;
  setViewportHeight(height: number): void;
};
```

## Rules

**Layout**
- A row's size is its measured size if `measure` has been called for it. Otherwise it's `estimateSize(index)`.
- `start(0) = 0`, and `start(i + 1) = end(i) + gap`.
- `getTotalSize()` is `end(count - 1)`, or `0` when the list is empty.

**Visible range** for a given `scrollTop`:
- The visible rows are every row that overlaps `[scrollTop, scrollTop + viewportHeight)`, meaning `end > scrollTop` and `start < scrollTop + viewportHeight`.
- If `scrollTop` falls inside a gap, the first visible row is the next one.
- Add `overscan` rows before and after, clamped to `[0, count - 1]`.
- `scrollTop` beyond either end is clamped to `[0, max(0, total - viewportHeight)]`.
- Return the rows in index order, or `[]` when `count` is 0.

**`measure(index, size, scrollTop = 0)`**
- Records the real size.
- Returns the **scroll adjustment**: `newSize - oldSize` when the row **starts above** the viewport (`start < scrollTop`), otherwise `0`. Adding this to `scrollTop` keeps the visible content from jumping.

**`scrollToIndex(index, { align = 'auto', scrollTop = 0 })`** returns the new scrollTop:
- `start`: the row's start is at the top.
- `end`: the row's end is at the bottom.
- `center`: the row's middle is in the middle.
- `auto`: if the row is fully visible, keep `scrollTop`. If it's above, use `start`. If it's below, use `end`.
- Clamp the result to `[0, max(0, total - viewportHeight)]`.
- Clamp `index` to `[0, count - 1]`.

**`setCount`** (infinite loading) keeps measurements for indexes that still exist. New rows use `estimateSize`.

**Performance.** With 100,000 rows, thousands of interleaved `measure` and `getVirtualItems` calls must stay fast. A full O(n) recomputation per call is too slow; aim for O(log n). A Fenwick (binary indexed) tree of sizes works well.
