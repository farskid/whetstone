Accept an abortable task, and an outside signal.

```ts
interface TimeoutOptions<T> {
  // ...stage 2, plus:
  signal?: AbortSignal;   // an outside signal that cancels the wait
}

function withTimeout<T>(
  input: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  ms: number,
  options?: TimeoutOptions<T>,
): Promise<T>;
```

- If `input` is a function, call it once, synchronously, with a fresh `AbortSignal`. On timeout, **abort that signal** with the timeout error (the same `TimeoutError`, or your custom `Error`) as its reason, before the result settles.
- `options.signal`: if it is already aborted, reject with its `reason` (the task is never called). If it aborts later, reject with its `reason`, abort the task's signal with that reason, and clear the timer.
