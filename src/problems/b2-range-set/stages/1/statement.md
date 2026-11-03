Build `RangeSet`, the data structure behind a calendar's free/busy view. Start with adding ranges.

```ts
const busy = new RangeSet();
busy.add([9, 10]); busy.add([10, 11]); busy.add([14, 15]);
busy.toArray();   // [[9, 11], [14, 15]]
```

```ts
type Range = [start: number, end: number];   // half-open: start is in, end is out

class RangeSet {
  add(range: Range): void;
  toArray(): Range[];
}
```

- **Ranges are half-open.** `[s, e)` covers every `x` with `s <= x < e`. A range with `e <= s` is empty, and `add` ignores it. <!-- tests: merges touching ranges [1,3) + [3,5) | ignores zero-length and inverted ranges -->
- `add` merges the new range with every range it overlaps **or touches**: `[1, 3)` + `[3, 5)` → `[1, 5)`. One added range can swallow many existing ones. <!-- tests: merges overlapping ranges, including one that spans many | merges touching ranges [1,3) + [3,5) -->
- `toArray()` returns the ranges sorted by start, as fresh arrays, so changing the result doesn't change the set. <!-- tests: adds disjoint ranges and returns them sorted | never mutates inputs or exposes internal arrays -->
- Never mutate the arrays you were given. <!-- tests: never mutates inputs or exposes internal arrays -->
- Bounds can be any number, including `±Infinity`.
