```ts
interface RunOptions { priority?: number; signal?: AbortSignal }
concurrency: number; // readable AND writable
```

**`signal`**
- If the signal is already aborted, `run` rejects with an `AbortError` and `fn` is never called.
- If it aborts while the task is still queued, the task leaves the queue and rejects with an `AbortError`.
- Once a task is running, aborting does nothing.

**`concurrency`**
- `limiter.concurrency` reads the current limit.
- Setting it validates the value the same way `createLimiter` does, and throws a `TypeError` on a bad one.
- Raising it starts more queued tasks immediately. Lowering it never interrupts running tasks; it only delays new starts.
