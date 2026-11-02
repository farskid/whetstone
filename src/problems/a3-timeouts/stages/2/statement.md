Add a fallback, a custom message, and clean up after yourself.

```ts
interface TimeoutOptions<T> {
  fallback?: T | (() => T | Promise<T>);
  message?: string | Error;
  clock?: Clock;
}
```

- Once the result settles, **no timer is left behind**. <!-- tests: no timer is left after the promise settles first -->
- With `message` as a string, use it as the TimeoutError's message. With `message` as an `Error`, reject with that error instead. <!-- tests: message: a string sets the TimeoutError message, an Error is used as-is -->
- With `fallback`, a timeout doesn't reject. If `fallback` is a function, call it and settle the result with whatever it returns, throws or rejects. Otherwise resolve with the value. (`message` is ignored when there's a fallback.) <!-- tests: fallback value resolves instead of rejecting | fallback function is called and its result (or throw) is used -->
