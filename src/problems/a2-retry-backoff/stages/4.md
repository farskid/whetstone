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
1. If the error is an `AbortError`, reject with its `originalError` at once. `onFailedAttempt` is not called.
2. Call and await `onFailedAttempt({ error, attempt, retriesLeft })`, where `retriesLeft` is how many calls are still allowed. If it throws or rejects, reject with **that** error.
3. If `retriesLeft` is 0, reject with the error.
4. If `shouldRetry` is given and resolves to `false`, reject with the error.
5. Wait the backoff, then call `fn` again.

**`signal`**
- Already aborted: reject with `signal.reason` without calling `fn`.
- Aborted during a backoff wait: reject with `signal.reason` right away and clear the timer.
- Aborted while `fn` is running: once `fn` settles, reject with `signal.reason` instead of retrying (a success still resolves).
