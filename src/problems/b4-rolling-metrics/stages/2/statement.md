Add min, max and percentiles.

```ts
class RollingWindow {
  // ...stage 1, plus:
  min(): number | undefined;
  max(): number | undefined;
  percentile(p: number): number | undefined;
}
```

- `percentile(p)` uses **nearest rank** over the sorted values: index `ceil(p / 100 * n) - 1`, clamped to `0..n-1`. So `p = 0` is the min and `p = 100` the max. <!-- tests: percentile uses nearest rank -->
- `p` outside `0..100` throws a `RangeError`, even on an empty window.
- On an empty window, `min`, `max` and `percentile` return `undefined`. <!-- tests: empty window: min, max and percentile return undefined -->
- `min()` and `max()` must be amortized O(1): keep monotonic deques, don't scan the window. There's a performance test (200k pushes into a 50k window, reading min and max after each). <!-- tests: perf: 200k pushes into a 50k window with min/max after each | min and max follow the window as values leave -->
