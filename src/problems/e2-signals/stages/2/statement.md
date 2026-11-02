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
function effect(fn: () => void | (() => void)): () => void;
```

- `effect` runs `fn` right away and tracks every signal or computed it reads (`.value`, not `.peek()`).
- When one of them changes, `fn` runs again **synchronously**: by the time the assignment returns, the effect has re-run. A computed counts as changed only when it re-computes to a value that isn't `Object.is`-equal to the old one.
- Writing an `Object.is`-equal value to a signal doesn't re-run anything.
- If `fn` returns a function, that cleanup runs right before the next run and on dispose.
- `effect` returns `dispose()`. It runs the pending cleanup and the effect never runs again. Calling it a second time does nothing.
- In this stage an effect reads the same signals on every run, and it doesn't write to signals.
