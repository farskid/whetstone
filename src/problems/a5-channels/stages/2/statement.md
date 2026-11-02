Add an optional buffer.

```ts
class Channel<T> {
  constructor(capacity?: number);   // default 0 = unbuffered (stage 1)
  // ...
}
```

With `capacity` N > 0:
- If a receiver is waiting, `send` hands the value straight to it. Otherwise, if fewer than N values are buffered, it buffers the value and resolves right away. Otherwise it waits.
- `receive` takes the oldest buffered value. When that frees a slot, the oldest waiting sender moves its value into the buffer, and its `send` resolves.
- Values always come out in the order they were sent.
- `capacity` 0 (or leaving it out) keeps the stage-1 rendezvous behaviour.
