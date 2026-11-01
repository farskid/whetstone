# Async channel with backpressure

Build a Go-style `Channel<T>` for async code, plus `merge` and `select`.

```ts
const jobs = new Channel<Job>(10);
// producer
for (const job of list) await jobs.send(job);   // waits when 10 are queued
jobs.close();
// consumer
for await (const job of jobs) await handle(job);
```

## API

```ts
interface Received<T> { value: T | undefined; done: boolean }

class Channel<T> implements AsyncIterable<T> {
  constructor(capacity?: number);   // default 0
  send(value: T): Promise<void>;
  receive(): Promise<Received<T>>;
  close(): void;
  readonly closed: boolean;
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

function merge<T>(...channels: Channel<T>[]): Channel<T>;
function select<T>(channels: Channel<T>[]): Promise<{ index: number; value: T | undefined; done: boolean }>;
```

## Rules

**Unbuffered (`capacity` 0)**
- `send(v)` resolves only once a receiver has taken `v`.
- `receive()` resolves `{ value, done: false }` once a sender hands it a value.
- Waiting senders and waiting receivers are each served in FIFO order.

**Buffered (`capacity` N > 0)**
- If a receiver is waiting, `send` hands the value straight to it. Otherwise, if fewer than N values are buffered, it buffers the value and resolves right away. Otherwise it waits.
- `receive` takes the oldest buffered value. When that frees a slot, the oldest waiting sender moves its value into the buffer, and its `send` resolves.
- Values always come out in the order they were sent.

**Close**
- `close()` sets `closed`. Calling it again does nothing.
- Values already in the buffer can still be received. After that, and for every receiver already waiting, `receive()` resolves `{ value: undefined, done: true }`.
- `send` after close, and every sender still waiting at close time, rejects with `Error('Channel closed')`.
- `for await (const v of ch)` yields values until the channel is closed and drained.

**`merge(...chs)`** returns an unbuffered channel that gets every value from every input, keeping each input's order. It closes once all inputs are closed and drained.

**`select(chs)`** waits until at least one channel can give a result: a buffered value, a waiting sender, or closed-and-drained. It then takes **exactly one** result and resolves `{ index, value, done }`.
- If several are ready when `select` is called, pick the lowest index.
- `select` must not take, and lose, a value from any other channel. A value sent later to a channel that lost the race must still reach its next receiver.
