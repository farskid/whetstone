Add a fallback, a custom message, and clean up after yourself.

```ts
interface TimeoutOptions<T> {
  fallback?: T | (() => T | Promise<T>);
  message?: string | Error;
  clock?: Clock;
}
```

- Once the result settles, **no timer is left behind**.
- With `message` as a string, use it as the TimeoutError's message. With `message` as an `Error`, reject with that error instead.
- With `fallback`, a timeout doesn't reject. If `fallback` is a function, call it and settle the result with whatever it returns, throws or rejects. Otherwise resolve with the value. (`message` is ignored when there's a fallback.)
