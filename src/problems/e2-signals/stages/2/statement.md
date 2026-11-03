Add **`effect(fn)`**: code that runs now and again whenever what it read changes.

```ts
const count = signal(1);
const double = computed(() => count.value * 2);
const dispose = effect(() => {
  console.log('double is', double.value);
  return () => console.log('cleanup');
});                   // "double is 2"
count.value = 2;      // "cleanup", "double is 4"
dispose();            // "cleanup", and the effect never runs again
```

```ts
type EffectFn = () => void | (() => void);
function effect(fn: EffectFn): () => void;
```

- `effect` runs `fn` right away and tracks every signal or computed it reads (`.value`, not `.peek()`). <!-- tests: effect runs immediately and re-runs on change -->
- When one of them changes, `fn` runs again **synchronously**: by the time the assignment returns, the effect has re-run. A computed counts as changed only when it re-computes to a value that isn't `Object.is`-equal to the old one. <!-- tests: effect runs immediately and re-runs on change -->
- Writing an `Object.is`-equal value to a signal doesn't re-run anything. <!-- tests: writing an equal value does not notify -->
- If `fn` returns a function, that cleanup runs right before the next run and on dispose. <!-- tests: cleanup runs before each re-run -->
- `effect` returns `dispose()`. It runs the pending cleanup and the effect never runs again. Calling it a second time does nothing. <!-- tests: dispose stops the effect and runs its cleanup -->
- In this stage an effect reads the same signals on every run, and it doesn't write to signals.
