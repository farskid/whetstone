webpack's plugin system runs on tapable: a plugin *taps* a named hook, and the compiler *calls* it. Start with the simplest hook.

```ts
const compile = new SyncHook<[string]>();
compile.tap('Logger', (file) => console.log('compiling', file));
compile.tap({ name: 'Stats' }, (file) => count(file));
compile.call('index.ts');   // Logger, then Stats
```

```ts
type TapOptions = string | { name: string };

class SyncHook<A extends unknown[]> {
  tap(options: TapOptions, fn: (...args: A) => unknown): void;
  call(...args: A): void;
}
```

- Every tap needs a non-empty `name`, given as a string or as `{ name }`. Otherwise `tap` throws. Names don't have to be unique.
- `call` calls every tap in registration order with the call's arguments, ignores their return values, and returns `undefined`. With no taps it does nothing.
- A throwing tap propagates out of `call`, and the remaining taps don't run.
- A call runs the taps that existed when it started. Taps added during a call run from the next call on.
