Finish the leaderboard and make it fast.

```ts
class SortedSet {
  // ...stage 3, plus:
  denseRevRank(member: string): number | undefined;
  around(member: string, k: number): Entry[];
}
```

- `denseRevRank(member)` is the number of **distinct** scores strictly higher than the member's score. Tied players share a dense rank, and there are no gaps. It must stay right as scores change and members leave. A missing member gives `undefined`. <!-- tests: dense rank shares ranks between ties with no gaps -->
- `around(member, k)` returns up to `k` entries before the member, the member, and up to `k` after, in reverse (leaderboard) order. Near the top or bottom you get fewer. A missing member gives `[]`. <!-- tests: around(member, k) pages the leaderboard -->
- **Performance:** with 100k members, `add`, `remove`, `rank` and `incrBy` must be O(log n), so a sorted array no longer works. Use a balanced tree with subtree sizes (a treap or skip list). There's a timed test, plus a randomized test against a naive model. <!-- tests: perf: 100k members with ranks and increments | random ops match a naive model -->
