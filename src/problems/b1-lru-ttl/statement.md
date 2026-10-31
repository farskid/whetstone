# LRU cache with TTL

Build `LRUCache<K, V>`, a small version of **lru-cache**. It's a map with a size limit that evicts the **least recently used** entry, lets entries **expire**, and tells you why an entry left.

```ts
const cache = new LRUCache<string, User>({ max: 500, ttl: 60_000 });
cache.set('u1', user);
cache.get('u1');               // user (and u1 becomes most recently used)
cache.set('u2', other, { ttl: 5_000 });
```

## Options

```ts
interface Options<K, V> {
  max: number;                       // max number of entries (integer >= 1)
  ttl?: number;                      // default time-to-live in ms; 0 / undefined = never expires
  maxSize?: number;                  // optional limit on the total size of all entries
  sizeOf?: (value: V, key: K) => number; // needed if maxSize is set (default: every entry has size 1)
  onEvict?: (key: K, value: V, reason: EvictReason) => void;
  clock?: { now(): number };         // default: Date
}
type EvictReason = 'evict' | 'expire' | 'delete' | 'overwrite';
```

## Methods

| method | recency | notes |
|---|---|---|
| `get(key)` | **marks as most recent** | `undefined` when missing or expired |
| `peek(key)` | no change | like `get` without touching recency |
| `has(key)` | no change | `false` when missing or expired |
| `set(key, value, { ttl? })` | **marks as most recent** | returns `this`; a per-entry `ttl` overrides the default |
| `delete(key)` | | returns `true` if a live entry was removed |
| `clear()` | | removes everything |
| `size` | | number of **live** entries (expired entries don't count) |
| `keys()` | | live keys, most recent first |
| `purgeStale()` | | removes every expired entry and returns how many it removed |

`get`, `set`, `has`, `peek` and `delete` must be **O(1)**. The tests use 50,000 operations.

## Expiry
- An entry set at time `t` with ttl `T` is expired once `clock.now() >= t + T`.
- Expired entries act as if they were absent. When you find one (in `get`, `peek`, `has` or `purgeStale`) remove it and fire `onEvict(key, value, 'expire')`.
- Setting a key again resets its TTL.

## Eviction callbacks
`onEvict` fires once each time an entry leaves the cache:
- `'evict'`: dropped to stay within `max` or `maxSize`. It always drops the least recently used entry first.
- `'expire'`: its TTL ran out.
- `'delete'`: removed by `delete(key)` or `clear()`. `clear()` reports entries that had already expired as `'expire'`.
- `'overwrite'`: `set` replaced the value of an existing key. The callback gets the **old** value. Setting the exact same value (`Object.is`) doesn't fire it.

## Size limits
- When `maxSize` is set, the cache keeps `sum(sizeOf(v, k)) <= maxSize`, evicting LRU entries until the new one fits.
- An item whose own size is greater than `maxSize` is **not stored**. If the key already had a value, that old value is removed with reason `'delete'`.
- `sizeOf` must return a positive number. If it doesn't, `set` throws a `TypeError`.
- `max` must be an integer `>= 1`. If it isn't, the constructor throws a `TypeError`.
