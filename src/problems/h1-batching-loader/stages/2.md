Add a per-key cache and handle errors. The cache is always on in this stage.

- **Dedupe.** Loading a key that's already cached or already waiting returns the **same promise**. It doesn't add the key to a batch again.
- **Errors per key.** A result that is an `Error` instance means that one key failed: it rejects with that error and is removed from the cache, so the next `load()` tries again.
- **A failed batch.** If `batchFn` throws, rejects, or doesn't return a promise, every key in that batch rejects with that error (a `TypeError` for a non-promise). All of those keys leave the cache.
- **Wrong length.** If the result array's length differs from the number of keys, every key in the batch rejects with a `TypeError`, and those keys leave the cache.
