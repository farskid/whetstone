Add an optional buffer.

```ts
class Channel<T> {
  constructor(capacity?: number);   // default 0 = unbuffered (stage 1)
  // ...
}
```

With `capacity` N > 0:
- If a receiver is waiting, `send` hands the value straight to it. Otherwise, if fewer than N values are buffered, it buffers the value and resolves right away. Otherwise it waits. <!-- tests: buffered send resolves at once until the buffer is full -->
- `receive` takes the oldest buffered value. When that frees a slot, the oldest waiting sender moves its value into the buffer, and its `send` resolves. <!-- tests: receiving frees a slot for the oldest waiting sender -->
- Values always come out in the order they were sent. <!-- tests: order is preserved through buffer and waiting senders -->
- `capacity` 0 (or leaving it out) keeps the stage-1 rendezvous behaviour. <!-- tests: unbuffered send waits for a receiver | waiting senders and receivers are served FIFO -->
