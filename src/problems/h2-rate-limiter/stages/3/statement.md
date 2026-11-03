# Rate limiter: sliding window

A token bucket can't tell a client when to come back. Add a **sliding-window counter** that reports what an HTTP response needs for its rate-limit headers.

```ts
const w = new SlidingWindow({ limit: 10, windowMs: 1000, clock });
w.hit(); // { allowed: true, remaining: 9, resetAt: 1000, retryAfter: 0 }
```

## `new SlidingWindow({ limit, windowMs, clock? })`

Time is cut into fixed windows `[k·windowMs, (k+1)·windowMs)`. The limiter keeps two counts: the current window and the one just before it. A gap of a whole window or more means the previous count is 0. <!-- tests: no double burst at a window boundary; a gap clears the history -->

**The estimate.** At `e` ms into the current window, the estimated number of requests in the last `windowMs` is: <!-- tests: counts the previous window by how much of it still overlaps -->

```
count = previous × (windowMs − e) / windowMs + current
```

**`hit(n = 1)`** checks whether `count + n ≤ limit`. If so, it adds `n` to the current count. It returns `{ allowed, remaining, resetAt, retryAfter }`:

- **`remaining`** is `floor(limit − count)`, never below 0. When the hit is allowed, `count` includes it.
- **`resetAt`** is when the current window ends.
- **`retryAfter`** is 0 when allowed. Otherwise it's the ms, rounded up, until the same `hit(n)` would be allowed if nothing else happened. That moment can fall later in this window, or in the next one, when the current count becomes the previous count. <!-- tests: retryAfter can land in the next window -->

**Not counted and not allowed.**
- A denied hit isn't counted.
- `n > limit` throws a `RangeError`.
- `limit` and `windowMs` must be positive numbers.

Everything from earlier stages still applies.
