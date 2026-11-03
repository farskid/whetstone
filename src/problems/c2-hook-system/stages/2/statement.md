Add two sync hooks that use the taps' return values. They share `tap` and the stage 1 rules (names, order, snapshot, throws).

```ts
const transform = new SyncWaterfallHook<[string, string]>();
transform.tap('Minify', (code, file) => code.trim());
transform.call(' x ', 'a.js');   // 'x'

class SyncBailHook<A extends unknown[], R> { call(...args: A): R | undefined }
class SyncWaterfallHook<A extends [unknown, ...unknown[]]> { call(...args: A): A[0] }
```

- `SyncBailHook` returns the first return value that isn't `undefined`, and skips the remaining taps. `null`, `0` and `false` all bail. It returns `undefined` if no tap bails (or there are no taps). <!-- tests: bail: the first non-undefined return wins (null, 0 and false bail too) -->
- `SyncWaterfallHook` needs at least one argument. It passes the current value as the first argument and the other arguments unchanged. A tap's return value becomes the new value, unless it is `undefined`, which keeps the previous one. `call` returns the final value: the first argument if there are no taps. <!-- tests: waterfall: values flow; undefined keeps the previous; other args pass through -->
