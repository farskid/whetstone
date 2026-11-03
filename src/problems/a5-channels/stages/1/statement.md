Build a Go-style `Channel<T>` for async code. In this first stage it is **unbuffered**: a send and a receive meet, and each waits for the other.

```ts
const ch = new Channel<string>();
const sent = ch.send('hi');        // waits: nobody is receiving yet
const got = await ch.receive();    // { value: 'hi', done: false }
await sent;                        // resolves now that a receiver took the value
```

```ts
interface Received<T> { value: T | undefined; done: boolean }

class Channel<T> {
  constructor();
  send(value: T): Promise<void>;
  receive(): Promise<Received<T>>;
}
```

- `send(v)` resolves only once a receiver has taken `v`. <!-- tests: unbuffered send waits for a receiver -->
- `receive()` resolves `{ value, done: false }` once a sender hands it a value. If a sender is already waiting, it takes that sender's value right away (and that `send` resolves). <!-- tests: receive waits for a sender -->
- If a receiver is already waiting, `send(v)` hands `v` to it and resolves. <!-- tests: receive waits for a sender -->
- Waiting senders are served in FIFO order, and so are waiting receivers. <!-- tests: waiting senders and receivers are served FIFO -->
- `done` is always `false` in this stage (closing comes later). <!-- tests: unbuffered send waits for a receiver | receive waits for a sender -->
