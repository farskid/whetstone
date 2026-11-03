Add a read/write lock.

```ts
class RWLock {
  readLock(): Promise<Release>;
  writeLock(): Promise<Release>;
  runRead<T>(fn: () => T | Promise<T>): Promise<T>;
  runWrite<T>(fn: () => T | Promise<T>): Promise<T>;
}
```

- Any number of readers may hold the lock together. A writer holds it alone. <!-- tests: readers share the lock; a writer is exclusive -->
- **Writer preference.** Once a writer is waiting, new `readLock` calls wait behind it, so readers can't starve the writer. <!-- tests: a waiting writer blocks new readers (writer preference) -->
- Grant in arrival order: when the lock frees up, grant the waiter at the front. If it's a reader, grant it and every reader directly behind it, up to the next waiting writer. <!-- tests: readers queued together behind a writer are granted together -->
- `runRead` / `runWrite` acquire, run `fn`, and release even if `fn` throws. Each `release` works once, like the others. <!-- tests: runWrite sections never overlap with runRead sections -->
