Let entries expire.

```ts
new LRUCache({ max: 500, ttl: 60_000, clock });   // clock: { now(): number }, default Date
cache.set('u2', other, { ttl: 5_000 });            // per-entry ttl overrides the default
```

- `ttl` is in ms. `0` or `undefined` means the entry never expires. <!-- tests: per-entry ttl overrides the default; ttl 0 never expires -->
- An entry set at time `t` with ttl `T` is expired once `clock.now() >= t + T`. <!-- tests: default ttl: entries expire at exactly setAt + ttl -->
- Expired entries act as if they were absent: `get`/`peek` return `undefined`, `has` returns `false`, and they don't count towards `size` or `keys()`. <!-- tests: default ttl: entries expire at exactly setAt + ttl | expired entries do not count towards size or keys() -->
- Setting a key again resets its TTL. `get()` does not. <!-- tests: setting a key again resets its TTL; get() does not -->
