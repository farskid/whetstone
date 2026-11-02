# Rate limiter: waiting in line

`tryRemove` gives up straight away. Add a way to **wait** for tokens, in a fair line that can be aborted.

```ts
const b = new TokenBucket({ capacity: 4, refillPerSec: 1, tokens: 0, clock });
const first = b.removeTokens(2);  // waits about 2 s
const second = b.removeTokens(1); // served after first, even though it needs less
b.tryRemove();                    // false: someone is waiting
```

The `clock` now also needs `setTimeout(fn, ms)` returning an id, and `clearTimeout(id)`.

## Waiting in line: `bucket.removeTokens(n = 1, { signal }?)`

`removeTokens` returns a promise that resolves once `n` tokens have been taken:

- **Right away.** If nobody is waiting and there are enough tokens, it takes them and resolves.
- **Waiting.** Otherwise the call joins a **FIFO** line and is served strictly in order. A large request at the front holds back smaller ones behind it.
- **No cutting in.** While anyone is waiting, `tryRemove` returns `false`.
- **Timers.** Wait with one `clock.setTimeout` for the front of the line, no polling. When nobody is waiting, no timer is left.
- **Impossible requests.** An `n` above `capacity` can never succeed, so the promise rejects with a `RangeError` right away.
- **Aborting.**
  - **Already aborted:** a `signal` that's already aborted rejects with `signal.reason` without joining the line.
  - **Aborted while waiting:** the call leaves the line and rejects with `signal.reason`. The next caller in line can then be served at once.

Everything from earlier stages still applies.
