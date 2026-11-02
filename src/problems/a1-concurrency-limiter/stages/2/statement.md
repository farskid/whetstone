```ts
interface Limiter {
  run<T>(fn: () => T | Promise<T>): Promise<T>;
  readonly activeCount: number;   // tasks running right now
  readonly pendingCount: number;  // tasks waiting in the queue
  onIdle(): Promise<void>;
}
```

- `activeCount` is already updated when `run()` returns. <!-- tests: activeCount and pendingCount -->
- A finished task frees its slot **before** its `run` promise settles. The next queued task has already started by then, so code awaiting `run` sees the updated counts. <!-- tests: a failed task frees its slot before run() rejects -->
- `onIdle()` resolves once nothing is running and nothing is queued. If that's already true, it returns an already-resolved promise. <!-- tests: onIdle() waits for running and queued work -->
