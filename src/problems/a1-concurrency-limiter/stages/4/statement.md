```ts
interface RunOptions { priority?: number; signal?: AbortSignal }
concurrency: number; // readable AND writable
```

**`signal`**
- If the signal is already aborted, `run` rejects with an `AbortError` and `fn` is never called. <!-- tests: already-aborted signal: rejects and never calls fn -->
- If it aborts while the task is still queued, the task leaves the queue and rejects with an `AbortError`. <!-- tests: aborting a queued task removes it from the queue -->
- Once a task is running, aborting does nothing. <!-- tests: aborting a running task does not reject it -->

**`concurrency`**
- `limiter.concurrency` reads the current limit. <!-- tests: raising concurrency starts queued tasks immediately | lowering concurrency never interrupts running tasks -->
- Setting it validates the value the same way `createLimiter` does, and throws a `TypeError` on a bad one. <!-- tests: the concurrency setter rejects invalid values too -->
- Raising it starts more queued tasks immediately. Lowering it never interrupts running tasks; it only delays new starts. <!-- tests: raising concurrency starts queued tasks immediately | lowering concurrency never interrupts running tasks -->
