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
- Values already in the buffer can still be received. After that, `receive()` resolves `{ value: undefined, done: true }`, every time it is called.
- Receivers already waiting when `close()` is called resolve `{ value: undefined, done: true }`.
- `send` after close, and every sender still waiting at close time, rejects with `Error('Channel closed')`.
- `for await (const v of ch)` yields values until the channel is closed and drained. Breaking out of the loop early must not take (and lose) the next value.
