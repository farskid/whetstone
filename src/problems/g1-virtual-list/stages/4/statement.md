# Virtual list: scale

Add infinite-loading support and make every call fast on huge lists.

```ts
v.setCount(200);           // more rows loaded; measurements of rows 0..199 are kept
v.setViewportHeight(600);  // the window was resized
```

## API changes

```ts
// Virtualizer gains:
setCount(count: number): void;
setViewportHeight(height: number): void;
```

## Rules

- **`setCount`** keeps measurements for indexes that still exist and forgets the rest. A row that comes back after being removed uses `estimateSize` again. New rows use `estimateSize`. <!-- tests: setCount keeps measurements; setViewportHeight changes the range -->
- **`setViewportHeight`** changes the viewport used by every later call. <!-- tests: setCount keeps measurements; setViewportHeight changes the range -->
- **Performance.** With 100,000 rows, thousands of interleaved `measure` and `getVirtualItems` calls must stay fast. A full O(n) recomputation per call is too slow; aim for O(log n). A Fenwick (binary indexed) tree of sizes works well. <!-- tests: 100k rows: interleaved measure + getVirtualItems stay fast -->
- Everything from earlier stages still applies.
