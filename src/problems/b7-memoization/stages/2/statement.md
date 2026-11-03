Make `memoizeOne` configurable and safe.

```ts
function memoizeOne<F extends (...args: any[]) => any>(
  fn: F,
  isEqual?: (newArgs: unknown[], lastArgs: unknown[]) => boolean,
): F;
```

- `isEqual(newArgs, lastArgs)` decides a hit. Without it, use the stage 1 rule (same arg count, each pair `Object.is`-equal). <!-- tests: custom isEqual -->
- `fn` is called with the caller's `this`. `this` is part of the cache check: a hit needs the same `this` as the last call, as well as equal args. <!-- tests: keeps the this binding and keys on it -->
- If `fn` throws, rethrow and don't touch the cache. The previous successful call stays cached, and the failed args are retried next time. <!-- tests: throws are not cached; the previous result stays cached -->
