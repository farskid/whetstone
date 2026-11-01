# Range set / availability

Build `RangeSet`, the data structure behind a calendar's free/busy view, and use it to find a time when everyone is free.

```ts
const busy = new RangeSet();
busy.add([9, 10]); busy.add([10, 11]); busy.add([14, 15]);
busy.toArray();                     // [[9, 11], [14, 15]]
busy.freeSlots([8, 18], 2);         // [[11, 14], [15, 18]]
```

## API

```ts
type Range = [start: number, end: number];   // half-open: start is in, end is out

class RangeSet {
  add(range: Range): void;
  remove(range: Range): void;
  contains(x: number): boolean;
  overlaps(range: Range): boolean;
  toArray(): Range[];
  freeSlots(window: Range, minDuration?: number): Range[];   // minDuration default 0
}

interface Person { busy: Range[]; workingHours: Range[] }
function commonFreeSlots(people: Person[], window: Range, minDuration?: number): Range[];
```

## Rules

**Ranges are half-open.** `[s, e)` covers every `x` with `s <= x < e`. A range with `e <= s` is empty and is ignored by `add`, `remove` and `overlaps` (for `overlaps`, the answer is `false`).

**add**
- Merges with every range it overlaps **or touches**: `[1, 3)` + `[3, 5)` → `[1, 5)`.
- `toArray()` returns the ranges sorted by start, as fresh arrays, so changing the result doesn't change the set.
- Never mutate the arrays you were given.

**remove** subtracts the range, splitting a range in two when needed. `[0, 10)` minus `[3, 5)` → `[0, 3), [5, 10)`.

**Queries.** `contains(x)` and `overlaps([s, e))` must run in O(log n) (binary search). There's a performance test with tens of thousands of ranges.

**freeSlots(window, minDuration)** returns the parts of `window` not covered by the set, sorted, keeping only gaps whose length is at least `minDuration`.

**commonFreeSlots(people, window, minDuration)** returns the times inside `window` where **every** person is inside one of their `workingHours` ranges and none of their `busy` ranges, keeping gaps of at least `minDuration`. With no people, the whole window is free.
