# Retry with backoff

Write `retry(fn, options)`, a small version of **p-retry**. It calls a flaky async function again and again, waiting longer between attempts, until it succeeds or you run out of retries.

```ts
const user = await retry((attempt) => fetchUser(id), {
  retries: 4,
  minTimeout: 200,
  onFailedAttempt: ({ attempt, retriesLeft }) => console.log(`attempt ${attempt} failed, ${retriesLeft} left`),
});
```

## API

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

class AbortError extends Error {
  constructor(errorOrMessage: Error | string);
  readonly originalError: Error;
}

interface FailedAttempt { error: Error; attempt: number; retriesLeft: number }

interface RetryOptions {
  retries?: number;        // default 10. Max calls = retries + 1
  minTimeout?: number;     // default 1000 (ms)
  factor?: number;         // default 2
  maxTimeout?: number;     // default Infinity
  randomize?: boolean;     // default false (full jitter)
  random?: () => number;   // default Math.random, returns [0, 1)
  shouldRetry?: (error: Error) => boolean | Promise<boolean>;
  onFailedAttempt?: (info: FailedAttempt) => void | Promise<void>;
  signal?: AbortSignal;
  clock?: Clock;           // default: global setTimeout / clearTimeout
}

function retry<T>(fn: (attempt: number) => T | Promise<T>, options?: RetryOptions): Promise<T>;
```

## Rules

**Attempts**
- `fn` is called with the attempt number, starting at 1. A sync throw counts as a failure, like a rejection.
- If `fn` throws something that isn't an `Error`, wrap it as `new TypeError('Non-error was thrown: ' + String(value))` and treat that as the error.
- After `retries + 1` failed calls, reject with the **last** error.

**Backoff.** Before retry number `n` (n = 1 for the wait after the first failure), wait
`min(maxTimeout, minTimeout * factor ** (n - 1))` ms. With `randomize: true`, multiply that capped value by `random()`. Use `options.clock` for the wait.

**When a call fails**, do these in order:
1. If the error is an `AbortError`, reject with its `originalError` at once. `onFailedAttempt` is not called.
2. Call and await `onFailedAttempt({ error, attempt, retriesLeft })`, where `retriesLeft` is how many calls are still allowed. If it throws or rejects, reject with **that** error.
3. If `retriesLeft` is 0, reject with the error.
4. If `shouldRetry` is given and resolves to `false`, reject with the error.
5. Wait the backoff, then call `fn` again.

**`AbortError`.** `new AbortError(err)` keeps `err` as `originalError`. `new AbortError('msg')` uses itself as `originalError`. Its `name` is `'AbortError'`.

**`signal`**
- Already aborted: reject with `signal.reason` without calling `fn`.
- Aborted during a backoff wait: reject with `signal.reason` right away and clear the timer.
- Aborted while `fn` is running: once `fn` settles, reject with `signal.reason` instead of retrying (a success still resolves).
