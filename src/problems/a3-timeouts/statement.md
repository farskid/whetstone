# Timeouts & cancellation

Write `withTimeout` (like **p-timeout**) and `anySignal` (like **AbortSignal.any**).

```ts
const user = await withTimeout(fetchUser(id), 2000);
const page = await withTimeout((signal) => fetch(url, { signal }), 5000, { fallback: () => cachedPage });
const signal = anySignal([userCancel.signal, routeChange.signal]);
```

## API

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

class TimeoutError extends Error {}   // name = 'TimeoutError'

interface TimeoutOptions<T> {
  fallback?: T | (() => T | Promise<T>);
  message?: string | Error;
  signal?: AbortSignal;   // an outside signal that cancels the wait
  clock?: Clock;          // default: global setTimeout / clearTimeout
}

function withTimeout<T>(
  input: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  ms: number,
  options?: TimeoutOptions<T>,
): Promise<T>;

function anySignal(signals: AbortSignal[]): AbortSignal;
```

## Rules

**withTimeout**
- If `input` settles first, the result settles the same way.
- If `ms` passes first, reject with `new TimeoutError('Timed out after <ms> ms')`. With `message` as a string, use it as the TimeoutError's message. With `message` as an `Error`, reject with that error instead.
- With `fallback`, a timeout doesn't reject. If `fallback` is a function, call it and settle the result with whatever it returns, throws or rejects. Otherwise resolve with the value. (`message` is ignored when there's a fallback.)
- Once the result settles, **no timer is left behind**.
- `ms = Infinity` never times out (and sets no timer).
- If `input` is a function, call it once, synchronously, with a fresh `AbortSignal`. On timeout, **abort that signal** with the timeout error (the same `TimeoutError`, or your custom `Error`) as its reason, before the result settles.
- `options.signal`: if it is already aborted, reject with its `reason` (the task is never called). If it aborts later, reject with its `reason`, abort the task's signal with that reason, and clear the timer.

**anySignal**
- Returns a new signal that aborts as soon as **any** input aborts, with that input's `reason`. Later aborts don't change it.
- If an input is already aborted, the result is aborted right away with the first such input's reason (in array order).
- Once it has aborted, it removes every listener it added to the inputs.
- `anySignal([])` returns a signal that never aborts.
