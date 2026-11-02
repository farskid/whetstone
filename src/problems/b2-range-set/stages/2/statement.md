Add removal and fast queries.

```ts
class RangeSet {
  // ...stage 1, plus:
  remove(range: Range): void;
  contains(x: number): boolean;
  overlaps(range: Range): boolean;
}
```

- `remove` subtracts the range, splitting a range in two when needed: `[0, 10)` minus `[3, 5)` → `[0, 3), [5, 10)`. Removing a range that only touches existing ones changes nothing. An empty range (`e <= s`) is ignored.
- `contains(x)` is `true` when some range has `s <= x < e`.
- `overlaps([s, e))` is `true` when the range shares at least one point with the set. Touching is not overlapping (`[20, 30)` does not overlap `[10, 20)`). An empty range never overlaps.
- `contains` and `overlaps` must run in O(log n) (binary search). There's a performance test with 20,000 ranges and 100,000 queries.
