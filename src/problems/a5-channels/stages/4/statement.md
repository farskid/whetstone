Combine channels.

```ts
function merge<T>(...channels: Channel<T>[]): Channel<T>;
function select<T>(channels: Channel<T>[]): Promise<{ index: number; value: T | undefined; done: boolean }>;
```

**`merge(...chs)`** returns an unbuffered channel that gets every value from every input, keeping each input's order. It closes once all inputs are closed and drained. <!-- tests: merge delivers every value, in order per input, then closes -->

**`select(chs)`** waits until at least one channel can give a result: a buffered value, a waiting sender, or closed-and-drained. It then takes **exactly one** result and resolves `{ index, value, done }`. <!-- tests: select waits, and losing channels keep their later values | select reports a closed channel as done -->
- If several are ready when `select` is called, pick the lowest index. <!-- tests: select picks the lowest ready index without touching the others -->
- `select` must not take, and lose, a value from any other channel. A value sent later to a channel that lost the race must still reach its next receiver. <!-- tests: select picks the lowest ready index without touching the others | select waits, and losing channels keep their later values -->
