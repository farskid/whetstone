Give callers control over the cache.

```ts
interface LoaderOptions<K, C> {
  // ...stage 3, plus:
  cacheKeyFn?: (key: K) => C;
}

class Loader<K, V, C = K> {
  constructor(batchFn: BatchFn<K, V>, options?: LoaderOptions<K, C>);
  load(key: K): Promise<V>;
  loadMany(keys: readonly K[]): Promise<(V | Error)[]>;
  clear(key: K): this;
  clearAll(): this;
  prime(key: K, value: V): this;
}
```

- **`clear(key)`** removes one key from the cache. **`clearAll()`** removes everything. Both return the loader.
- **`prime(key, value)`** puts a value in the cache, but only if the key isn't already there. It returns the loader. It does nothing when the cache is off.
- **`cacheKeyFn(key)`** maps a key to the value the cache uses. Two different objects with the same `id` can then share an entry. `batchFn` still gets the original keys.
- **`loadMany(keys)`** loads several keys. It resolves to an array that holds a value or an `Error` for each key, and never rejects.
