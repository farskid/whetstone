Write `retry(fn, options)`, a small version of **p-retry**. It calls a flaky async function again until it succeeds or you run out of retries.

```ts
const user = await retry((attempt) => fetchUser(id), { retries: 4, minTimeout: 200 });
```

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

interface RetryOptions {
  retries?: number;     // default 10. Max calls = retries + 1
  minTimeout?: number;  // default 1000 (ms) wait between attempts
  clock?: Clock;        // default: global setTimeout / clearTimeout
}

function retry<T>(fn: (attempt: number) => T | Promise<T>, options?: RetryOptions): Promise<T>;
```

- `fn` is called with the attempt number, starting at 1. A sync throw counts as a failure, like a rejection.
- If `fn` throws something that isn't an `Error`, wrap it as `new TypeError('Non-error was thrown: ' + String(value))` and treat that as the error.
- After a failure, wait `minTimeout` ms on `options.clock`, then call `fn` again.
- After `retries + 1` failed calls, reject with the **last** error. Don't start a wait after the last call.
