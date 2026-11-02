Add a per-key cache and handle errors. The cache is always on in this stage.

- **Dedupe.** Loading a key that's already cached or already waiting returns the **same promise**. It doesn't add the key to a batch again. <!-- tests: duplicate keys are deduped and later loads hit the cache -->
- **Errors per key.** A result that is an `Error` instance means that one key failed: it rejects with that error and is removed from the cache, so the next `load()` tries again. <!-- tests: an Error value rejects only its key, and that key can be retried -->
- **A failed batch.** If `batchFn` throws, rejects, or doesn't return a promise, every key in that batch rejects with that error (a `TypeError` for a non-promise). All of those keys leave the cache. <!-- tests: a rejected or throwing batchFn rejects the whole batch, and the keys can be retried -->
- **Wrong length.** If the result array's length differs from the number of keys, every key in the batch rejects with a `TypeError`, and those keys leave the cache. <!-- tests: a result of the wrong length rejects every key with a TypeError -->
