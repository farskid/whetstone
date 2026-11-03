Add the leaderboard operations.

```ts
class SortedSet {
  // ...stage 2, plus:
  incrBy(member: string, delta: number): number;   // returns the new score
  revRank(member: string): number | undefined;     // 0 = highest
}
```

- `incrBy` adds `delta` to the member's score and moves it. On a missing member it starts at 0 (so the member is created with score `delta`). <!-- tests: incrBy creates and moves members -->
- `revRank` is the rank in the reverse order: exactly the ascending order backwards. Among equal scores, the name later in the alphabet comes first. A missing member gives `undefined`. <!-- tests: revRank and reverse ranges are the exact reverse order -->
