Report why entries leave, and add `purgeStale()`.

```ts
type EvictReason = 'evict' | 'expire' | 'delete' | 'overwrite';
new LRUCache({ max, onEvict: (key, value, reason) => { /* ... */ } });
cache.purgeStale(); // removes every expired entry, returns how many it removed
```

`onEvict` fires once each time an entry leaves the cache:
- `'evict'`: dropped to stay within `max`. It always drops the least recently used entry first. <!-- tests: onEvict reasons: evict, expire, delete, overwrite -->
- `'expire'`: its TTL ran out. Fire it when you find the expired entry (in `get`, `peek`, `has` or `purgeStale`) and remove it. <!-- tests: onEvict reasons: evict, expire, delete, overwrite | purgeStale() removes and reports expired entries -->
- `'delete'`: removed by `delete(key)` or `clear()`. `clear()` reports entries that had already expired as `'expire'`. <!-- tests: onEvict reasons: evict, expire, delete, overwrite | clear() fires delete for every entry -->
- `'overwrite'`: `set` replaced the value of an existing key. The callback gets the **old** value. Setting the exact same value (`Object.is`) doesn't fire it. <!-- tests: onEvict reasons: evict, expire, delete, overwrite -->
