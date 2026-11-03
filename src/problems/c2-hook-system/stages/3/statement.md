Add async hooks.

```ts
const emit = new AsyncSeriesHook<[string[]]>();
emit.tapPromise('Upload', async (files) => upload(files));
emit.tap('Log', (files) => console.log(files));
await emit.promise(['a.js']);

class AsyncSeriesHook<A extends unknown[]> {
  tap(options: TapOptions, fn: (...args: A) => unknown): void;
  tapPromise(options: TapOptions, fn: (...args: A) => Promise<unknown>): void;
  promise(...args: A): Promise<void>;
}
class AsyncParallelHook<A extends unknown[]> { /* same API */ }
```

- Async hooks accept both `tap` (a sync function; its return value is ignored) and `tapPromise` (a function returning a promise). A `tapPromise` function that doesn't return a thenable makes the hook reject. <!-- tests: AsyncSeriesHook runs taps one at a time, mixing tap and tapPromise -->
- A throw from either kind of tap makes `promise` reject. It never throws synchronously. <!-- tests: AsyncSeriesHook stops at the first rejection or throw -->
- `AsyncSeriesHook.promise` runs taps one at a time, starting each after the previous one settles. The first rejection or throw rejects the hook, and later taps don't run. <!-- tests: AsyncSeriesHook runs taps one at a time, mixing tap and tapPromise | AsyncSeriesHook stops at the first rejection or throw -->
- `AsyncParallelHook.promise` starts every tap synchronously, in order, inside the `promise` call. It resolves when all have resolved, and rejects as soon as any rejects or throws. <!-- tests: AsyncParallelHook starts every tap at once and waits for all | AsyncParallelHook rejects as soon as one tap rejects -->
- Both resolve to `undefined`, and resolve right away with no taps. The taps for a call are fixed when it starts, as before.
