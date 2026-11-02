Add options that control batching.

```ts
interface LoaderOptions {
  cache?: boolean;                                    // default true
  maxBatchSize?: number;                              // default Infinity
  batchScheduleFn?: (dispatch: () => void) => void;   // default: queueMicrotask
}

class Loader<K, V> {
  constructor(batchFn: BatchFn<K, V>, options?: LoaderOptions);
}
```

- **`cache: false`** turns the cache off. Every `load()` goes into a batch, even a repeated key in the same run.
- **`maxBatchSize`** caps how many keys go into one `batchFn` call. When a batch is full, the next `load()` starts a new batch with its own schedule. Batches are sent in the order they started. Anything other than a positive integer or `Infinity` throws a `RangeError`.
- **`batchScheduleFn(dispatch)`** replaces `queueMicrotask`. It's called once when a batch starts, and the batch is sent when it calls `dispatch`. For example, `(cb) => setTimeout(cb, 10)` collects loads for 10 ms.
