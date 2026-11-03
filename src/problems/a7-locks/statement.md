# Mutex, semaphore, RW lock

Build the three async locks from **async-mutex**: a weighted `Semaphore`, a `Mutex`, and a read/write lock `RWLock`.

```ts
const db = new Semaphore(4);
const rows = await db.runExclusive(() => query(sql));      // weight 1
const release = await db.acquire(4, { timeout: 1000 });    // all four slots
try { await migrate(); } finally { release(); }
```

## API

```ts
interface Clock { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(id: unknown): void }
type Release = () => void;
interface LockOptions { clock?: Clock }
interface AcquireOptions { timeout?: number }

class Semaphore {
  constructor(capacity: number, options?: LockOptions);
  acquire(weight?: number, options?: AcquireOptions): Promise<Release>;   // weight default 1
  tryAcquire(weight?: number): Release | null;
  runExclusive<T>(fn: () => T | Promise<T>, weight?: number): Promise<T>;
  readonly available: number;   // free capacity right now
  readonly waiting: number;     // queued acquires
}

class Mutex {   // a Semaphore of capacity 1
  constructor(options?: LockOptions);
  acquire(options?: AcquireOptions): Promise<Release>;
  tryAcquire(): Release | null;
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T>;
  readonly locked: boolean;
}

class RWLock {
  readLock(): Promise<Release>;
  writeLock(): Promise<Release>;
  runRead<T>(fn: () => T | Promise<T>): Promise<T>;
  runWrite<T>(fn: () => T | Promise<T>): Promise<T>;
}
```

## Rules

**Semaphore**
- `acquire(w)` resolves with a `release` function once `w` units are free. It holds them until `release()` is called.
- **Strict FIFO.** Waiters are granted in the order they called `acquire`. A waiter that doesn't fit yet blocks everyone behind it, even lighter ones that would fit. Releasing grants as many waiters from the front as now fit.
- `acquire` with no waiters and enough room is granted **synchronously** (the promise is already resolved; `available` drops right away).
- Calling a `release` more than once does nothing after the first call.
- A weight that isn't a positive integer, or is above `capacity`, throws a `RangeError` (synchronously from `acquire` / `tryAcquire`).
- `tryAcquire(w)` grants at once if there is no queue and room, otherwise returns `null` (it never queues).
- `runExclusive(fn, w)` acquires, runs `fn`, and releases even if `fn` throws. It resolves or rejects like `fn`.

**Timeout.** `acquire(w, { timeout })` that isn't granted within `timeout` ms rejects with `Error('Acquire timed out')` and leaves the queue, so it never gets the lock. Waiters behind it may now be granted. A granted acquire clears its timer.

**Mutex.** Capacity 1. `locked` is true while held.

**RWLock**
- Any number of readers may hold the lock together. A writer holds it alone.
- **Writer preference.** Once a writer is waiting, new `readLock` calls wait behind it, so readers can't starve the writer.
- Grant in arrival order: when the lock frees up, grant the waiter at the front. If it's a reader, grant it and every reader directly behind it, up to the next waiting writer.
