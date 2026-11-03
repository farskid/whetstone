```ts
interface RunOptions {
  priority?: number;
}

run<T>(fn: () => T | Promise<T>, options?: RunOptions): Promise<T>;
clearQueue(): void;
```

- Queued tasks with a higher `priority` start first. Equal priorities stay FIFO. The default is `0`. <!-- tests: higher priority jumps the queue; ties stay FIFO -->
- `clearQueue()` rejects every *queued* task with an `Error` whose `name` is `'AbortError'`. Running tasks carry on, and `onIdle()` resolves once they finish. <!-- tests: clearQueue() rejects queued tasks with AbortError, running ones finish | onIdle() after clearQueue() resolves once the running task ends -->
