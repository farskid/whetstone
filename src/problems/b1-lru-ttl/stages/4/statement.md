Limit the total size, not just the entry count.

```ts
new LRUCache<string, string>({ max: 100, maxSize: 10, sizeOf: (value, key) => value.length });
```

- When `maxSize` is set, the cache keeps `sum(sizeOf(v, k)) <= maxSize`, evicting LRU entries (reason `'evict'`) until the new one fits. Without `sizeOf`, every entry has size 1. <!-- tests: maxSize evicts LRU entries until the new one fits -->
- Overwriting a key with a smaller value frees the difference. <!-- tests: maxSize evicts LRU entries until the new one fits -->
- An item whose own size is greater than `maxSize` is **not stored**. If the key already had a value, that old value is removed with reason `'delete'`. Other entries stay. <!-- tests: an item bigger than maxSize is not stored (and drops the old value) -->
- `sizeOf` must return a positive number. If it doesn't, `set` throws a `TypeError`. <!-- tests: a non-positive size from sizeOf throws TypeError -->
