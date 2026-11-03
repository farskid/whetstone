Let a waiter give up.

```ts
interface Clock { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void }

class Semaphore {
  constructor(capacity: number, options?: { clock?: Clock });
  acquire(weight?: number, options?: { timeout?: number }): Promise<Release>;
  // ...
}

class Mutex {
  constructor(options?: { clock?: Clock });
  acquire(options?: { timeout?: number }): Promise<Release>;
  // ...
}
```

- `acquire(w, { timeout })` that isn't granted within `timeout` ms rejects with `Error('Acquire timed out')` and leaves the queue, so it never gets the lock. Waiters behind it may now be granted. <!-- tests: acquire timeout rejects and the waiter never gets the lock | a timed-out heavy waiter unblocks lighter ones behind it -->
- A granted acquire clears its timer (no timer is left behind). <!-- tests: a granted acquire clears its timeout timer -->
- No `timeout` (or `timeout: undefined`) waits forever, as before. An acquire granted synchronously never starts a timer.
- Use `options.clock` for the timers (default: the global `setTimeout` / `clearTimeout`).
