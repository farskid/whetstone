Add `memoize`, which caches every distinct argument tuple, with an optional LRU limit.

```ts
const fib = memoize((n: number): number => (n < 2 ? n : fib(n - 1) + fib(n - 2)), { max: 1000 });

interface MemoizeOptions { max?: number }
type Memoized<F> = F & { clear(): void };

function memoize<F extends (...args: any[]) => any>(fn: F, options?: MemoizeOptions): Memoized<F>;
```

- Key the cache through nested `Map`s, one level per argument. No `JSON.stringify` or string keys.
- Arguments compare like `Map` keys (SameValueZero): `NaN` matches `NaN`, `0` matches `-0`, `1` and `'1'` differ, `null` and `undefined` differ, and objects and functions match by identity. <!-- tests: NaN, null, undefined and arity are distinct keys | object args are keyed by identity -->
- `f(1)` and `f(1, undefined)` are different calls, so arity is part of the key. So are `f()` and `f(undefined)`. <!-- tests: NaN, null, undefined and arity are distinct keys -->
- Without `max` the cache is unbounded. With `max`, keep at most `max` results: a hit makes an entry the most recent, and storing a new one evicts the least recently used. <!-- tests: LRU eviction with max; a hit refreshes recency -->
- Throws are not cached. `this` is passed through to `fn` but is not part of the key. `clear()` empties the cache. <!-- tests: memoize: throws not cached, this passed through, clear() empties -->
