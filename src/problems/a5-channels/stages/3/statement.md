Let producers say they are finished.

```ts
class Channel<T> implements AsyncIterable<T> {
  // ...stages 1–2, plus:
  close(): void;
  readonly closed: boolean;
  [Symbol.asyncIterator](): AsyncIterator<T>;
}
```

- `close()` sets `closed` to `true`. Calling it again does nothing.
- Values already in the buffer can still be received. After that, `receive()` resolves `{ value: undefined, done: true }`, every time it is called. <!-- tests: close: buffered values still come out, then done -->
- Receivers already waiting when `close()` is called resolve `{ value: undefined, done: true }`. <!-- tests: close wakes waiting receivers with done -->
- `send` after close, and every sender still waiting at close time, rejects with `Error('Channel closed')`. <!-- tests: send after close and blocked senders reject with "Channel closed" -->
- `for await (const v of ch)` yields values until the channel is closed and drained. Breaking out of the loop early must not take (and lose) the next value. <!-- tests: for await yields every value until closed | breaking out of for await does not lose the next value -->
