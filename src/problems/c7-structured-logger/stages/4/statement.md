Make transports production-grade: per-transport levels, batched one-at-a-time writes, write errors and sampling.

```ts
interface Transport { level?: Level; write(chunk: string): void | Promise<void> }

// options, plus:
//   sample?: Partial<Record<Level, number>>;         // keep probability per level, 0..1
//   random?: () => number;                           // default Math.random
//   onError?: (err: unknown, chunk: string) => void; // a transport write failed
```

- A line goes only to transports whose `level` (default `trace`) it meets.
- Writes are buffered and asynchronous:
  - Nothing is written during the log call.
  - Lines logged in the same tick reach a transport as one `write` call of the concatenated lines.
  - A transport never has two writes in flight. Lines logged while a write is pending go in the next write, in order.
- A failed write (a throw or a rejection) calls `onError(err, chunk)`, and the queue keeps going.
- `flush()` still resolves once every line logged before the call has been written.
- **Sampling:** for a level listed in `sample`, a line is kept only if `random()` is less than the rate. `random` is called once per line at that level that passes the level check. Dropped lines are not serialized at all, so no serializer runs for them.
