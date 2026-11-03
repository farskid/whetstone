Build the caching helpers that show up in every front-end codebase. Start with the simplest: `memoizeOne` remembers only the most recent call.

```ts
const area = memoizeOne((w: number, h: number) => w * h);
area(2, 3);   // computes 6
area(2, 3);   // 6 from the cache
area(4, 3);   // computes 12, and forgets (2, 3)
```

```ts
function memoizeOne<F extends (...args: any[]) => any>(fn: F): F;
```

- If the new call has the same number of args as the last one, and each pair is equal by `Object.is`, return the cached result without calling `fn`. <!-- tests: caches the last call only | shallow equality: same object hits, equal-looking object misses, arg count matters -->
- Otherwise call `fn`, remember these args and the result, and return it. Only the last call is remembered. <!-- tests: caches the last call only -->
- Objects compare by identity, so `{ x: 1 }` and another `{ x: 1 }` are different. `NaN` equals `NaN`. `f(1)` and `f(1, undefined)` are different calls. <!-- tests: shallow equality: same object hits, equal-looking object misses, arg count matters -->
