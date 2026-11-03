Build the async locks from **async-mutex**, starting with a `Mutex`: only one holder at a time, everyone else waits in line.

```ts
const m = new Mutex();
const release = await m.acquire();
try { await writeFile(); } finally { release(); }

await m.runExclusive(() => writeFile());   // the same, in one call
```

```ts
type Release = () => void;

class Mutex {
  acquire(): Promise<Release>;
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T>;
  readonly locked: boolean;
}
```

- `acquire()` resolves with a `release` function once the lock is free. The caller holds the lock until it calls `release()`. <!-- tests: mutex runs critical sections one at a time, in call order -->
- When the lock is free and nobody is waiting, `acquire()` takes it **synchronously**: `locked` is `true` right after the call, before the promise is awaited. <!-- tests: locked reflects the state, and the first acquire is synchronous -->
- Waiters get the lock in the order they called `acquire()` (FIFO). Releasing hands the lock straight to the next waiter. <!-- tests: mutex runs critical sections one at a time, in call order -->
- Calling a `release` more than once does nothing after the first call. It must never free a lock that someone else now holds. <!-- tests: calling release twice is a no-op -->
- `runExclusive(fn)` acquires, runs `fn`, and releases even if `fn` throws. It resolves or rejects like `fn`. <!-- tests: runExclusive releases even when fn throws -->
- `locked` is `true` while anyone holds the lock. <!-- tests: locked reflects the state, and the first acquire is synchronous -->
