Read ranges of the set.

```ts
type Entry = { member: string; score: number };
type Bound = number | string;   // 5, '5', '(5' (exclusive), '-inf', '+inf'

interface RankRangeOptions { rev?: boolean }
interface ScoreRangeOptions { offset?: number; count?: number }
class SortedSet {
  // ...stage 1, plus:
  rangeByRank(start: number, stop: number, options?: RankRangeOptions): Entry[];
  rangeByScore(min: Bound, max: Bound, options?: ScoreRangeOptions): Entry[];
}
```

- Both return fresh `{ member, score }` objects.
- `rangeByRank(start, stop)` is inclusive at both ends. Negative indices count from the end (`-1` is the last). Clamp out-of-range indices. Return `[]` if `start` ends up after `stop`, or if the set is empty. <!-- tests: rangeByRank with negative and out-of-range indices -->
- `{ rev: true }` indexes the order backwards (index 0 is the highest). The reverse order is exactly the ascending order backwards, as in Redis, so among equal scores the name later in the alphabet comes first.
- `rangeByScore(min, max)` is inclusive by default. A string starting with `(` makes that bound exclusive. Numeric strings like `'7'` work like numbers. `'-inf'` and `'+inf'` (or the numbers `±Infinity`) are unbounded. Results are in ascending order. <!-- tests: rangeByScore inclusive and exclusive bounds | rangeByScore with infinite bounds and paging -->
- `offset` skips that many matches (default 0) and `count` keeps at most that many (default: all). An offset past the end gives `[]`. <!-- tests: rangeByScore with infinite bounds and paging -->
