Write `createLimiter(concurrency)`, a small version of **p-limit**. It runs async tasks while keeping at most `concurrency` of them in flight. <!-- tests: never more than `concurrency` tasks in flight -->

```ts
const limiter = createLimiter(2);
const pages = await Promise.all(urls.map((url) => limiter.run(() => fetch(url))));

interface Limiter {
  run<T>(fn: () => T | Promise<T>): Promise<T>;
}
```

**Running**
- `run(fn)` returns a promise for `fn`'s result. A plain (non-promise) return value works too. <!-- tests: run() resolves with the task result (sync or async) -->
- If `fn` throws synchronously or rejects, the promise from `run` rejects with that same error. The slot is freed either way. <!-- tests: errors reject that run() and free the slot -->
- When a slot is free, `fn` is called **synchronously** inside `run()`. <!-- tests: a free slot starts the task synchronously -->
- When a task settles, the next queued task starts right away. Queued tasks start in FIFO order. <!-- tests: never more than `concurrency` tasks in flight | FIFO order within the same priority -->

**`concurrency`** must be an integer `>= 1` or `Infinity`. Anything else makes `createLimiter` throw a `TypeError`. <!-- tests: invalid concurrency throws TypeError -->
