Serve stale values while revalidating.

```ts
interface GroupOptions {
  ttl?: number;
  staleAfter?: number;   // only with ttl: from this age on, serve the cached value and refresh in the background
  clock?: { now(): number };
}
```

- With a cached value whose age is at least `staleAfter` (and less than `ttl`), `do` resolves **right away** with the cached value and starts one background refresh with its `fn`. <!-- tests: stale value is returned at once and refreshed in the background | below staleAfter there is no refresh -->
- While a refresh is running, more `do` calls also get the cached value and don't start another refresh. <!-- tests: only one background refresh at a time -->
- A refresh that succeeds replaces the cached value (with a new timestamp). A refresh that fails keeps the old value, and the next stale `do` tries again. A failed refresh never causes an unhandled rejection. <!-- tests: stale value is returned at once and refreshed in the background | a failed refresh keeps the old value and the next stale call retries -->
- At age `ttl` or more, the value has expired and `do` behaves like a miss. <!-- tests: past ttl a stale value is not served -->
