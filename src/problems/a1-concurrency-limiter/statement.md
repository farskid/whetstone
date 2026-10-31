# Concurrency limiter

Write `createLimiter(concurrency)`, a small version of **p-limit** / **p-queue**. It runs async tasks while keeping at most `concurrency` of them in flight.

```ts
const limiter = createLimiter(2);
const pages = await Promise.all(urls.map((url) => limiter.run(() => fetch(url))));
```

## API

```ts
interface RunOptions { priority?: number; signal?: AbortSignal }

interface Limiter {
  run<T>(fn: () => T | Promise<T>, options?: RunOptions): Promise<T>;
  readonly activeCount: number;   // tasks running right now
  readonly pendingCount: number;  // tasks waiting in the queue
  concurrency: number;            // readable AND writable
  clearQueue(): void;
  onIdle(): Promise<void>;
}
```

## Rules

**Running**
- `run(fn)` returns a promise for `fn`'s result. A plain (non-promise) return value works too.
- If `fn` throws synchronously or rejects, the promise from `run` rejects with that same error. The slot is freed either way, and it is freed *before* the `run` promise settles, so code awaiting it already sees the updated `activeCount`.
- When a slot is free, `fn` is called **synchronously** inside `run()`, so `activeCount` is already updated when `run()` returns.
- When a task settles, the next queued task starts right away. The slot never sits empty while work is queued.

**Ordering**
- Queued tasks start in FIFO order within the same `priority`. Higher priority goes first. The default is `0`.

**`concurrency`**
- It must be an integer `>= 1` or `Infinity`. Anything else throws a `TypeError`, both in `createLimiter` and in the setter.
- Raising it starts more queued tasks immediately. Lowering it never interrupts running tasks; it only delays new starts.

**`clearQueue()`**
- Rejects every *queued* (not running) task with an `Error` whose `name` is `'AbortError'`.

**`signal`**
- If the signal is already aborted, `run` rejects with an `AbortError` and `fn` is never called.
- If it aborts while the task is still queued, the task leaves the queue and rejects with an `AbortError`.
- Once a task is running, aborting does nothing. Passing the signal into `fn` is up to the caller.

**`onIdle()`**
- Resolves once nothing is running and nothing is queued. If that's already true, the promise it returns is already resolved.

## Examples

```ts
const l = createLimiter(1);
l.run(slowA);                    // starts now
l.run(b);                        // queued
l.run(urgent, { priority: 5 });  // queued, but jumps ahead of b
l.activeCount;                   // 1
l.pendingCount;                  // 2
```
