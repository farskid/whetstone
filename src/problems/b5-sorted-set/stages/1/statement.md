Build a Redis-style sorted set to back a game leaderboard. Each member (a string) has exactly one numeric score. Start with adding members and asking for their rank.

```ts
const z = new SortedSet();
z.add('ana', 120);   // true: new member
z.add('bo', 95);
z.rank('bo');        // 0: lowest score
z.score('ana');      // 120
z.size;              // 2
```

```ts
class SortedSet {
  readonly size: number;
  add(member: string, score: number): boolean;   // true if the member is new
  score(member: string): number | undefined;
  remove(member: string): boolean;               // true if it was there
  rank(member: string): number | undefined;      // 0 = lowest
}
```

- Order is by score ascending, and equal scores are ordered by member name. Compare names with `<` (code-unit order, so `'Zed' < 'al'`), not `localeCompare`.
- Re-adding a member replaces its score and moves it. It returns `false` and `size` doesn't change.
- A score of `NaN` throws a `RangeError` and changes nothing. `±Infinity` are valid scores.
- `score` and `rank` of a missing member return `undefined`. `remove` of a missing member returns `false`.
- A sorted array is fine for now. The last stage adds a performance test that needs O(log n) operations.
