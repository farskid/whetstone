Write `createLimiter(concurrency)`, a small version of **p-limit**. It runs async tasks while keeping at most `concurrency` of them in flight.

```ts
const limiter = createLimiter(2);
const pages = await Promise.all(urls.map((url) => limiter.run(() => fetch(url))));

interface Limiter {
  run<T>(fn: () => T | Promise<T>): Promise<T>;
}
```

**Running**
- `run(fn)` returns a promise for `fn`'s result. A plain (non-promise) return value works too.
- If `fn` throws synchronously or rejects, the promise from `run` rejects with that same error. The slot is freed either way.
- When a slot is free, `fn` is called **synchronously** inside `run()`.
- When a task settles, the next queued task starts right away. Queued tasks start in FIFO order.

**`concurrency`** must be an integer `>= 1` or `Infinity`. Anything else makes `createLimiter` throw a `TypeError`.
