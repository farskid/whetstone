# Rate limiter: token bucket

APIs protect themselves with rate limits: "100 requests a minute per API key". Libraries like **rate-limiter-flexible** implement them with a few classic algorithms. Start with the simplest one, a **token bucket**: each request takes a token, and tokens trickle back in over time.

```ts
const b = new TokenBucket({ capacity: 5, refillPerSec: 2, clock });
b.tryRemove(5); // true: a burst up to capacity
b.tryRemove();  // false: empty
// 250 ms later
b.tokens;       // 0.5
```

Time comes from an injected `clock` with `now()` in ms. It defaults to the real one.

## `new TokenBucket({ capacity, refillPerSec, tokens?, clock? })`

The bucket holds up to `capacity` tokens and starts with `tokens` (default: full). It gains `refillPerSec` tokens per second, continuously, so fractions count: after 250 ms at 2 per second it has gained 0.5.

- **Validation.** `capacity` must be a positive number and `refillPerSec` a number ≥ 0. Otherwise the constructor throws a `RangeError`.
- **`tokens`** is a getter that returns the current level after refilling.
- **`tryRemove(n = 1)`** takes `n` tokens and returns `true` if there are enough. Otherwise it changes nothing and returns `false`. An `n` that isn't a positive number throws a `RangeError`.
- **Time going backwards.** If `clock.now()` is earlier than the last time the bucket looked, nothing is added. Time that was already counted is never counted again.
