# HTTP response cache: stale responses

Add the two directives that let a cache answer with a stale copy. Results can now also be `cache: 'STALE'`.

```ts
// stored with Cache-Control: max-age=60, stale-while-revalidate=30
await cache.fetch({ url: '/a' }); // 70 s later: STALE at once, refreshed in the background
```

## Rules

`no-cache` and `must-revalidate` turn off both of these rules.

- **`stale-while-revalidate=N`.** While the response is stale by at most N seconds, return it at once with `cache: 'STALE'` and revalidate in the background. <!-- tests: stale-while-revalidate answers at once and revalidates once in the background -->
  - Only one background revalidation can run per stored response at a time. <!-- tests: stale-while-revalidate answers at once and revalidates once in the background -->
  - A background failure is ignored, and the next stale hit may try again.
- **`stale-if-error=N`.** While the response is stale by at most N seconds, a network error or a 500, 502, 503 or 504 from the origin returns the stored copy with `cache: 'STALE'`. The stored copy is kept. <!-- tests: stale-if-error serves the stale copy on network errors and 5xx -->
- **Past the window**, the origin's answer, or its error, goes to the caller.

Everything from earlier stages still applies.
