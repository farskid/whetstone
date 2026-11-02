**dataloader** fixes the "N+1 queries" problem. Code all over an app asks for one record at a time with `load(id)`. The loader quietly collects those calls and sends them to the backend as one batch. Build a `Loader` class that does the same.

```ts
type BatchFn<K, V> = (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;

class Loader<K, V> {
  constructor(batchFn: BatchFn<K, V>);
  load(key: K): Promise<V>;
}

const users = new Loader(async (ids) => db.users.findMany(ids));
const [a, b] = await Promise.all([users.load(1), users.load(2)]); // one findMany([1, 2])
```

- `batchFn(keys)` gets an array of keys and returns a promise of an array of results. Result `i` belongs to `keys[i]`. <!-- tests: results line up with keys, and load(null) throws right away -->
- **`load(key)`** returns a promise of that key's value. It never calls `batchFn` itself. <!-- tests: loads in the same synchronous run share one batch, in call order -->
- **Same run, same batch.** Every `load()` in the same synchronous run of code goes into one batch, in call order. Send the batch with `queueMicrotask`. A later run gets its own batch. <!-- tests: loads in the same synchronous run share one batch, in call order -->
- **Bad keys.** `load(null)` and `load(undefined)` throw a `TypeError` right away. <!-- tests: results line up with keys, and load(null) throws right away -->
