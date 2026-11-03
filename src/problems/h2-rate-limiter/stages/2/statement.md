# Rate limiter: per-key limiters

Real limits are per user or per API key. Add a limiter that keeps one bucket per key and forgets keys that go quiet.

```ts
const l = createKeyedLimiter({ capacity: 2, refillPerSec: 1, clock });
l.tryRemove('alice'); // true: alice gets her own bucket
l.tokens('bob');      // 2: bob has no bucket yet, and none is created
l.size;               // 1
```

## Per-key limiters

`createKeyedLimiter({ capacity, refillPerSec, tokens?, clock?, idleMs? })` gives each key its own bucket:

- **`tryRemove(key, n = 1)`** creates the key's bucket on first use. <!-- tests: buckets are created per key on first use -->
- **`tokens(key)`** reports the key's level. For a key with no bucket it reports the starting level, without creating a bucket.
- **`size`** is the number of buckets kept.

**Idle eviction.** A bucket is dropped once `idleMs` have passed since the key's last `tryRemove` call, including a call that returned `false`. Eviction is checked on every call and when reading `size`. <!-- tests: idle buckets are evicted -->

`idleMs` defaults to the time an empty bucket takes to refill completely (`capacity / refillPerSec` seconds), so dropping a bucket can't hand out extra tokens. A shorter `idleMs` is allowed. A dropped key simply starts again with a fresh bucket. <!-- tests: idle buckets are evicted -->

Everything from earlier stages still applies.
