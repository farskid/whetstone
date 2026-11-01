# Rate limiter

APIs protect themselves with rate limits: "100 requests a minute per API key". Libraries like **rate-limiter-flexible** implement them with a few classic algorithms. Build two of them: a **token bucket** with a fair waiting line, and a **sliding-window counter** that reports what an HTTP response needs for its rate-limit headers.

Time comes from an injected `clock` (`now()`, `setTimeout`, `clearTimeout`, in ms). It defaults to the real one.

## `new TokenBucket({ capacity, refillPerSec, tokens?, clock? })`

The bucket holds up to `capacity` tokens and starts with `tokens` (default: full). It gains `refillPerSec` tokens per second, continuously, so fractions count: after 250 ms at 2 per second it has gained 0.5.

- **Validation.** `capacity` must be a positive number and `refillPerSec` a number ≥ 0. Otherwise the constructor throws a `RangeError`.
- **`tokens`** is a getter that returns the current level after refilling.
- **`tryRemove(n = 1)`** takes `n` tokens and returns `true` if there are enough. Otherwise it changes nothing and returns `false`. An `n` that isn't a positive number throws a `RangeError`.
- **Time going backwards.** If `clock.now()` is earlier than the last time the bucket looked, nothing is added. Time that was already counted is never counted again.

## Per-key limiters

`createKeyedLimiter({ capacity, refillPerSec, tokens?, clock?, idleMs? })` gives each key its own bucket:

- **`tryRemove(key, n = 1)`** creates the key's bucket on first use.
- **`tokens(key)`** reports the key's level. For a key with no bucket it reports the starting level, without creating a bucket.
- **`size`** is the number of buckets kept.

**Idle eviction.** A bucket is dropped once `idleMs` have passed since the key's last `tryRemove` call, including a call that returned `false`. Eviction is checked on every call and when reading `size`.

`idleMs` defaults to the time an empty bucket takes to refill completely (`capacity / refillPerSec` seconds), so dropping a bucket can't hand out extra tokens. A shorter `idleMs` is allowed. A dropped key simply starts again with a fresh bucket.

## `new SlidingWindow({ limit, windowMs, clock? })`

Time is cut into fixed windows `[k·windowMs, (k+1)·windowMs)`. The limiter keeps two counts: the current window and the one just before it. A gap of a whole window or more means the previous count is 0.

**The estimate.** At `e` ms into the current window, the estimated number of requests in the last `windowMs` is:

```
count = previous × (windowMs − e) / windowMs + current
```

**`hit(n = 1)`** checks whether `count + n ≤ limit`. If so, it adds `n` to the current count. It returns `{ allowed, remaining, resetAt, retryAfter }`:

- **`remaining`** is `floor(limit − count)`, never below 0. When the hit is allowed, `count` includes it.
- **`resetAt`** is when the current window ends.
- **`retryAfter`** is 0 when allowed. Otherwise it's the ms, rounded up, until the same `hit(n)` would be allowed if nothing else happened. That moment can fall later in this window, or in the next one, when the current count becomes the previous count.

**Not counted and not allowed.**
- A denied hit isn't counted.
- `n > limit` throws a `RangeError`.
- `limit` and `windowMs` must be positive numbers.

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
