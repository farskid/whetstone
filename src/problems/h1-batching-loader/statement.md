# Batching loader

**dataloader** fixes the "N+1 queries" problem. Code all over an app asks for one record at a time with `load(id)`. The loader quietly collects those calls and sends them to the backend as one batch. Build a `Loader` class that does the same.

## `new Loader(batchFn, options?)`

`batchFn(keys)` gets an array of keys and returns a promise of an array of results:

- **Order.** Result `i` belongs to `keys[i]`.
- **Errors per key.** A result that is an `Error` instance means that one key failed.

## Batching

- **`load(key)`** returns a promise of that key's value. It never calls `batchFn` itself.
- **Same run, same batch.** Every `load()` in the same synchronous run of code goes into one batch, in call order. By default the batch is sent with `queueMicrotask`.
- **Bad keys.** `load(null)` and `load(undefined)` throw a `TypeError` right away.

## Cache and errors

With the cache on (the default):

- **Dedupe.** Loading a key that's already cached or already waiting returns the **same promise**. It doesn't add the key to a batch again.
- **Errors aren't cached.** A key whose result is an `Error` rejects with that error and is removed from the cache, so the next `load()` tries again.
- **A failed batch.** If `batchFn` throws, rejects, or doesn't return a promise, every key in that batch rejects with that error (a `TypeError` for a non-promise). All of those keys leave the cache.
- **Wrong length.** If the result array's length differs from the number of keys, every key in the batch rejects with a `TypeError`, and those keys leave the cache.

## Options

- **`cache: false`** turns the cache off. Every `load()` goes into a batch, even a repeated key in the same run.
- **`maxBatchSize`** (default `Infinity`) caps how many keys go into one `batchFn` call. When a batch is full, the next `load()` starts a new batch with its own schedule. Batches are sent in the order they started. Anything other than a positive integer or `Infinity` throws a `RangeError`.
- **`batchScheduleFn(dispatch)`** replaces `queueMicrotask`. It's called once when a batch starts, and the batch is sent when it calls `dispatch`. For example, `(cb) => setTimeout(cb, 10)` collects loads for 10 ms.
- **`cacheKeyFn(key)`** maps a key to the value the cache uses. Two different objects with the same `id` can then share an entry. `batchFn` still gets the original keys.

## Cache control

- **`clear(key)`** removes one key from the cache. **`clearAll()`** removes everything. Both return the loader.
- **`prime(key, value)`** puts a value in the cache, but only if the key isn't already there. It returns the loader. It does nothing when the cache is off.
- **`loadMany(keys)`** loads several keys. It resolves to an array that holds a value or an `Error` for each key, and never rejects.

```ts
const users = new Loader(async (ids) => db.users.findMany(ids));
const [a, b] = await Promise.all([users.load(1), users.load(2)]); // one findMany([1, 2])
```
