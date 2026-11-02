Add a hook and cancellation.

```ts
interface FailedAttempt { error: Error; attempt: number; retriesLeft: number }

interface RetryOptions {
  // ...stages 1–3, plus:
  onFailedAttempt?: (info: FailedAttempt) => void | Promise<void>;
  signal?: AbortSignal;
}
```

**When a call fails**, do these in order:
1. If the error is an `AbortError`, reject with its `originalError` at once. `onFailedAttempt` is not called. <!-- tests: AbortError skips onFailedAttempt -->
2. Call and await `onFailedAttempt({ error, attempt, retriesLeft })`, where `retriesLeft` is how many calls are still allowed. If it throws or rejects, reject with **that** error. <!-- tests: onFailedAttempt gets { error, attempt, retriesLeft } for every failure | onFailedAttempt throwing stops with its error -->
3. If `retriesLeft` is 0, reject with the error. <!-- tests: rejects with the last error after retries + 1 calls -->
4. If `shouldRetry` is given and resolves to `false`, reject with the error. <!-- tests: shouldRetry returning false stops with that error -->
5. Wait the backoff, then call `fn` again. <!-- tests: waits minTimeout * factor^(n-1) between attempts -->

**`signal`**
- Already aborted: reject with `signal.reason` without calling `fn`. <!-- tests: an already-aborted signal never calls fn -->
- Aborted during a backoff wait: reject with `signal.reason` right away and clear the timer. <!-- tests: abort during a backoff wait rejects at once and clears the timer -->
- Aborted while `fn` is running: once `fn` settles, reject with `signal.reason` instead of retrying (a success still resolves).
