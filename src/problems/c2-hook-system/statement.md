# Hook system

webpack's plugin system runs on tapable: a plugin *taps* a named hook, and the compiler *calls* it. Build the main hook types.

```ts
const compile = new SyncHook<[string]>();
compile.tap('Logger', (file) => console.log('compiling', file));
compile.call('index.ts');

const transform = new SyncWaterfallHook<[string, string]>();
transform.tap('Minify', (code, file) => code.trim());
transform.call(' x ', 'a.js'); // 'x'

const emit = new AsyncSeriesHook<[string[]]>();
emit.tapPromise({ name: 'Upload', stage: 10 }, async (files) => upload(files));
await emit.promise(['a.js']);
```

## API

```ts
type TapOptions = string | { name: string; stage?: number; before?: string | string[] };
interface TapInfo { name: string; type: 'sync' | 'promise'; stage: number; fn: Function }
interface Interceptor { call?(...args): void; tap?(tap: TapInfo): void }

// every hook
tap(options: TapOptions, fn): void;
intercept(interceptor: Interceptor): void;

class SyncHook<A>              { call(...args: A): void }
class SyncBailHook<A, R>       { call(...args: A): R | undefined }
class SyncWaterfallHook<A>     { call(...args: A): A[0] }       // needs at least one argument
class AsyncSeriesHook<A>       { tapPromise(options, fn): void; promise(...args: A): Promise<void> }
class AsyncParallelHook<A>     { tapPromise(options, fn): void; promise(...args: A): Promise<void> }
```

## Rules

**Taps**
- Every tap needs a non-empty `name`. Otherwise `tap` throws.
- A call runs the taps that existed when it started. Taps added during a call run from the next call on.

**Sync hooks**
- `SyncHook` calls every tap in order with the call's arguments.
- `SyncBailHook` returns the first return value that isn't `undefined`, and skips the remaining taps. `null`, `0` and `false` all bail. It returns `undefined` if no tap bails.
- `SyncWaterfallHook` passes the current value as the first argument and the other arguments unchanged. A tap's return value becomes the new value, unless it is `undefined`, which keeps the previous one. `call` returns the final value.
- A throwing tap propagates out of `call`.

**Async hooks**
- They accept both `tap` (a sync function) and `tapPromise` (a function returning a promise). A `tapPromise` function that doesn't return a thenable makes the hook reject.
- `AsyncSeriesHook.promise` runs taps one at a time, starting each after the previous one settles. The first rejection or throw rejects the hook, and later taps don't run.
- `AsyncParallelHook.promise` starts every tap synchronously, in order. It resolves when all have resolved, and rejects as soon as any rejects or throws.

**Ordering**
- Taps run in ascending `stage` (default 0). Taps with the same stage run in registration order.
- `before: 'x'` or `before: ['x', 'y']` places the new tap just before the earliest of the named taps already registered, if that is earlier than its stage position. Names that aren't registered are ignored.

**Interceptors**
- `call(...args)` runs once at the start of each call, before any tap.
- `tap(tapInfo)` runs just before each tap runs.
- Interceptors run in the order they were added.
