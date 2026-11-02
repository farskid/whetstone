Add the same window over time instead of count.

```ts
interface Clock { now(): number }

class TimeWindow {
  constructor(options: { windowMs: number; clock?: Clock });
  push(x: number): void;
  toArray(): number[];   // oldest first
  count(): number;
  avg(): number | undefined;
  min(): number | undefined;
  max(): number | undefined;
  percentile(p: number): number | undefined;
}
```

- A value pushed at time `t` stays while `now - t < windowMs`. At exactly `windowMs` old it's gone.
- Time comes from `clock.now()` (default `Date.now`).
- Every read reflects the current time, even with no pushes since: if the clock jumps past the whole window, the window is empty.
- Everything else works as in `RollingWindow`: `NaN` throws a `RangeError`, empty reads return `undefined`, percentiles use nearest rank, and `min`/`max` stay amortized O(1).
