# Sorted set / leaderboard

Build a Redis-style sorted set to back a game leaderboard. Each member (a string) has exactly one numeric score.

```ts
const board = new SortedSet();
board.add('ana', 120);
board.add('bo', 95);
board.incrBy('bo', 40);        // 135
board.revRank('bo');           // 0: top of the board
board.rangeByScore('(100', '+inf');
```

## API

```ts
type Entry = { member: string; score: number };
type Bound = number | string;   // 5, '5', '(5' (exclusive), '-inf', '+inf'

interface RankRangeOptions { rev?: boolean }
interface ScoreRangeOptions { offset?: number; count?: number }
class SortedSet {
  readonly size: number;
  add(member: string, score: number): boolean;     // true if the member is new
  score(member: string): number | undefined;
  remove(member: string): boolean;
  rank(member: string): number | undefined;        // 0 = lowest
  revRank(member: string): number | undefined;     // 0 = highest
  rangeByRank(start: number, stop: number, options?: RankRangeOptions): Entry[];
  rangeByScore(min: Bound, max: Bound, options?: ScoreRangeOptions): Entry[];
  incrBy(member: string, delta: number): number;   // returns the new score
  denseRevRank(member: string): number | undefined;
  around(member: string, k: number): Entry[];
}
```

## Rules

**Ordering**
- Ascending order is by score, and equal scores are ordered by member name. Compare names with `<` (code-unit order), not `localeCompare`.
- The reverse order (`revRank`, `rangeByRank(..., { rev: true })`, `around`) is exactly the ascending order backwards, as in Redis. So among equal scores, the name later in the alphabet comes first.

**Members**
- Re-adding a member replaces its score and moves it.
- A score of `NaN` throws a `RangeError`. `±Infinity` are valid scores.
- `incrBy` on a missing member starts it at 0.

**Ranges**
- `rangeByRank(start, stop)` is inclusive at both ends. Negative indices count from the end (`-1` is the last). Clamp out-of-range indices. Return `[]` if `start` ends up after `stop`.
- `rangeByScore(min, max)` is inclusive by default. A string starting with `(` makes that bound exclusive. `'-inf'` and `'+inf'` (or the numbers `±Infinity`) are unbounded. Results are in ascending order. The optional `offset`/`count` page through the matches.

**Leaderboard extras**
- `denseRevRank(member)` is the number of **distinct** scores strictly higher than the member's score. Tied players share a dense rank, and there are no gaps.
- `around(member, k)` returns up to `k` entries before the member, the member, and up to `k` after, in reverse (leaderboard) order. Near the top or bottom you get fewer. A missing member gives `[]`.

**Performance:** with 100k members, `add`, `remove`, `rank` and `incrBy` must be O(log n). There's a timed test.
