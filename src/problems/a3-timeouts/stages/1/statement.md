Write `withTimeout`, a small version of **p-timeout**: race a promise against a deadline. The types (`Clock`, `TimeoutInput`, `TimeoutOptions`) are in the read-only `types.ts`; import them, and later stages' changes reach your code.

```ts
const user = await withTimeout(fetchUser(id), 2000);
```

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

class TimeoutError extends Error {}   // name = 'TimeoutError'

type TimeoutInput<T> = Promise<T>;   // stage 3 widens it

interface TimeoutOptions<T> {
  clock?: Clock;   // default: global setTimeout / clearTimeout
}

function withTimeout<T>(input: TimeoutInput<T>, ms: number, options?: TimeoutOptions<T>): Promise<T>;
```

- If `input` settles first, the result settles the same way. <!-- tests: resolves with the value when the promise wins | passes through a rejection that comes first -->
- If `ms` passes first, reject with `new TimeoutError('Timed out after <ms> ms')`. Settling later changes nothing. <!-- tests: rejects with TimeoutError("Timed out after 100 ms") at the deadline | a late resolve after the timeout changes nothing -->
- `ms = Infinity` never times out (and sets no timer). <!-- tests: ms = Infinity never times out and sets no timer -->
- Use `options.clock` for the timer. <!-- tests: rejects with TimeoutError("Timed out after 100 ms") at the deadline -->
