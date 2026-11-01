```ts
run<T>(fn: () => T | Promise<T>, options?: { priority?: number }): Promise<T>;
clearQueue(): void;
```

- Queued tasks with a higher `priority` start first. Equal priorities stay FIFO. The default is `0`.
- `clearQueue()` rejects every *queued* task with an `Error` whose `name` is `'AbortError'`. Running tasks carry on, and `onIdle()` resolves once they finish.
