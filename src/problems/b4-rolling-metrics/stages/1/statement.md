Build the sliding windows behind a "p95 latency over the last minute" panel. Start with a window over the last N values.

```ts
const w = new RollingWindow(3);
[1, 2, 3, 4, 5].forEach((x) => w.push(x));
w.toArray();   // [3, 4, 5]
w.count();     // 3
w.avg();       // 4
```

```ts
class RollingWindow {
  constructor(size: number);   // a positive integer
  push(x: number): void;
  toArray(): number[];         // oldest first
  count(): number;
  avg(): number | undefined;
}
```

- The window keeps the last `size` pushed values. Pushing into a full window drops the oldest value. <!-- tests: keeps the last N values, oldest first -->
- `toArray()` returns the values in the window, oldest first, as a fresh array. <!-- tests: keeps the last N values, oldest first -->
- `avg()` is the mean of the values in the window. On an empty window it returns `undefined`, and `count()` is 0. <!-- tests: a window that is not full yet | empty window returns undefined; NaN is rejected -->
- `push` of `NaN` (or anything that isn't a number) throws a `RangeError` and stores nothing. <!-- tests: empty window returns undefined; NaN is rejected -->
- A `size` that isn't a positive integer throws a `RangeError`.
