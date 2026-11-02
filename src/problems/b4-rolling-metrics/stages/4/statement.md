Add a bounded-memory histogram window.

```ts
class HistogramWindow {
  constructor(options: { windowMs: number; sliceMs: number; buckets: number[]; clock?: Clock });
  push(x: number): void;
  count(): number;
  percentile(p: number): number | undefined;
}
```

- `buckets` are ascending upper bounds. A value goes in the first bucket with `x <= bound`, and values above the last bound go in an overflow bucket whose bound is `Infinity`.
- Time is cut into slices: slice `k` covers `[k * sliceMs, (k + 1) * sliceMs)`. Each slice keeps only a count per bucket.
- When the current slice is `c`, slice `k` is in the window while `(c - k) * sliceMs < windowMs`. Older slices are dropped. Memory must not grow with the number of pushes.
- `count()` is the number of values in the live slices.
- `percentile(p)` finds the nearest-rank sample (same formula) in the bucket counts and returns **that bucket's upper bound**. It returns `undefined` when empty, and `p` outside `0..100` throws a `RangeError`.
- `NaN` throws a `RangeError`, as before.
