Generalise the mutex into a weighted `Semaphore`: `capacity` units, and each acquire takes `weight` of them.

```ts
class Semaphore {
  constructor(capacity: number);
  acquire(weight?: number): Promise<Release>;   // weight default 1
  tryAcquire(weight?: number): Release | null;
  runExclusive<T>(fn: () => T | Promise<T>, weight?: number): Promise<T>;
  readonly available: number;   // free units right now
  readonly waiting: number;     // queued acquires
}

class Mutex {   // now: a Semaphore of capacity 1
  // ...stage 1, plus:
  tryAcquire(): Release | null;
}
```

- `acquire(w)` resolves with a `release` once `w` units are free, and holds them until `release()`. With no waiters and enough room it is granted synchronously (`available` drops right away). A second call of the same `release` does nothing.
- **Strict FIFO.** Waiters are granted in the order they called `acquire`. A waiter that doesn't fit yet blocks everyone behind it, even lighter ones that would fit. Releasing grants as many waiters from the front as now fit.
- A weight that isn't a positive integer, or is above `capacity`, throws a `RangeError` synchronously from `acquire` / `tryAcquire`.
- `tryAcquire(w)` grants at once if nobody is queued and there is room, otherwise returns `null`. It never queues.
- `runExclusive(fn, w)` acquires `w`, runs `fn`, and releases even if `fn` throws.
