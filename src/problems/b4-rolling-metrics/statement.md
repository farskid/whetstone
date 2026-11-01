# Rolling metrics window

Build the sliding windows behind a "p95 latency over the last minute" panel. There are three: count-based, time-based, and a bounded-memory histogram.

```ts
const latency = new TimeWindow({ windowMs: 60_000 });
latency.push(123);
latency.percentile(95);
```

## API

```ts
interface Clock { now(): number }

interface Window {
  push(x: number): void;
  toArray(): number[];          // oldest first
  count(): number;
  avg(): number | undefined;
  min(): number | undefined;
  max(): number | undefined;
  percentile(p: number): number | undefined;
}

class RollingWindow implements Window { constructor(size: number) }
class TimeWindow implements Window { constructor(options: { windowMs: number; clock?: Clock }) }

class HistogramWindow {
  constructor(options: { windowMs: number; sliceMs: number; buckets: number[]; clock?: Clock });
  push(x: number): void;
  count(): number;
  percentile(p: number): number | undefined;
}
```

## Rules

**All windows**
- `push` of `NaN` (or anything that isn't a number) throws a `RangeError`.
- On an empty window, `avg`, `min`, `max` and `percentile` return `undefined`, and `count` is 0.
- `percentile(p)` uses **nearest rank** over the sorted values: index `ceil(p / 100 * n) - 1`, clamped to `0..n-1`. So `p = 0` is the min and `p = 100` the max. `p` outside `0..100` throws a `RangeError`.

**RollingWindow(size)** keeps the last `size` pushed values. `min()` and `max()` must be amortized O(1): keep monotonic deques, don't scan the window. There's a performance test.

**TimeWindow** keeps a value pushed at time `t` while `now - t < windowMs` (so at exactly `windowMs` old it's gone). Time comes from `clock.now()` (default `Date.now`). Every read reflects the current time, even with no pushes since.

**HistogramWindow**
- `buckets` are ascending upper bounds. A value goes in the first bucket with `x <= bound`, and values above the last bound go in an overflow bucket whose bound is `Infinity`.
- Time is cut into slices: slice `k` covers `[k * sliceMs, (k + 1) * sliceMs)`. Each slice keeps only a count per bucket.
- When the current slice is `c`, slice `k` is in the window while `(c - k) * sliceMs < windowMs`. Older slices are dropped. Memory must not grow with the number of pushes.
- `percentile(p)` finds the nearest-rank sample (same formula) in the bucket counts and returns **that bucket's upper bound**.
