Add **retries** with backoff and **garbage collection**, both on an injected clock.

```ts
const client = createQueryClient({ retry: 2, gcTime: 60_000, clock });
await client.fetchQuery(['k'], flaky);   // tries up to 3 times: waits 1000 ms, then 2000 ms
```

```ts
interface QueryClientOptions {
  staleTime?: number;                             // default 0
  gcTime?: number;                                // default 300_000
  retry?: number;                                 // extra attempts after a failure, default 0
  retryDelay?: (failureCount: number) => number;  // default n => 1000 * 2 ** (n - 1)
  clock?: { now(): number; setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void };
}
```

**Retries**
- On failure, wait `retryDelay(failureCount)` on `clock.setTimeout` (`failureCount` is 1 for the first retry), then call `fn` again. Do this up to `retry` times.
- Only the final failure counts: status becomes `'error'`, `error` is set, any old `data` is kept, and the promise rejects. While retrying, `fetchStatus` stays `'fetching'`.
- An aborted fetch stops retrying.

**Garbage collection**
- A query with no observers and no fetch in flight is removed after `gcTime`. Start the timer when it reaches that state (a fetch settles, the last observer leaves, or `setQueryData` writes an unobserved query).
- A new observer or fetch cancels the timer. A query is never collected mid-fetch.
- Calling an unsubscribe function twice does nothing the second time.
- After removal, `getState` returns `undefined` and `getQueryData` returns `undefined`.
