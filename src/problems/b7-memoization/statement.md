# Memoization family

Build three caching helpers that show up in every front-end codebase.

```ts
const area = memoizeOne((w: number, h: number) => w * h);
const fib = memoize((n: number): number => (n < 2 ? n : fib(n - 1) + fib(n - 2)), { max: 1000 });
const selectTotal = createSelector([(s: State) => s.items, (s: State) => s.taxRate], (items, rate) => sum(items) * (1 + rate));
```

## API

```ts
function memoizeOne<F extends (...args: any[]) => any>(fn: F, isEqual?: (newArgs: unknown[], lastArgs: unknown[]) => boolean): F;

function memoize<F extends (...args: any[]) => any>(fn: F, options?: { max?: number }): F & { clear(): void };

function createSelector<S, R>(
  inputs: ((state: S, ...args: any[]) => unknown)[],
  combiner: (...values: any[]) => R,
): ((state: S, ...args: any[]) => R) & { recomputations(): number; resetRecomputations(): void };
```

## Rules

**memoizeOne**
- Remembers only the most recent call. It returns the cached result when the new call has the same `this` and `isEqual(newArgs, lastArgs)` is true.
- The default `isEqual` needs the same number of args and each pair equal by `Object.is`.
- The function is called with the caller's `this`.
- If `fn` throws, rethrow and don't touch the cache. The previous successful call stays cached.

**memoize**
- Caches every distinct argument tuple, keyed through nested `Map`s, one level per argument. No `JSON.stringify` or string keys.
- Arguments compare like `Map` keys (SameValueZero): `NaN` matches `NaN`, `1` and `'1'` differ, and objects match by identity.
- `f(1)` and `f(1, undefined)` are different calls, so arity is part of the key.
- Object and function arguments go in a `WeakMap` level, so the cache alone doesn't keep them alive. (With `max` set, the recency list may hold them until they're evicted.)
- With `max`, keep at most `max` results. A hit makes an entry the most recent, and storing a new one evicts the least recently used.
- Throws are not cached. `this` is passed through but is not part of the key. `clear()` empties the cache.

**createSelector**
- Each call runs every input selector with the selector's arguments.
- If every input result is `Object.is`-equal to the previous call's, return the previous result without calling `combiner`.
- `recomputations()` counts combiner calls, and `resetRecomputations()` sets it back to 0.
