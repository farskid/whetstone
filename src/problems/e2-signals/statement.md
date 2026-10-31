# Signals

Build a small fine-grained reactivity library like **Preact Signals** or **SolidJS**. Export `signal`, `computed`, `effect`, `batch` and `untracked`.

## API

```ts
const count = signal(1);
const double = computed(() => count.value * 2);

const dispose = effect(() => {
  console.log('double is', double.value);
  return () => console.log('cleanup');
});

count.value = 2;      // effect re-runs: "cleanup", "double is 4"
batch(() => {         // effects run once, after the batch
  count.value = 3;
  count.value = 4;
});
dispose();            // "cleanup", and the effect never runs again
```

### `signal(initial)`
- `.value` reads (and tracks) the current value. Assigning `.value` updates it.
- `.peek()` reads the value **without** tracking.
- Assigning a value that is `Object.is`-equal to the current one does nothing.

### `computed(fn)`
- `.value` returns `fn()`'s result. `.peek()` reads without tracking.
- **Lazy:** `fn` doesn't run until someone reads `.value`.
- **Cached:** reading again without a dependency change doesn't call `fn` again.
- Re-computes only when one of the values it read last time changed.
- **Equality cutoff:** if it re-computes to an `Object.is`-equal value, things that depend on it don't re-run.
- If `fn` throws, reading `.value` re-throws that error. After a dependency changes it recovers.
- A computed that reads itself, directly or through other computeds, throws an `Error` whose message contains `Cycle`.

### `effect(fn)`
- Runs `fn` right away and tracks every signal or computed it reads.
- Re-runs when any of them changes. Dependencies are **dynamic**: only what the latest run read counts.
- If `fn` returns a function, that cleanup runs before the next run and on dispose.
- Returns `dispose()`. After dispose the effect never runs again.
- An effect may write to signals, including ones it reads. It re-runs until things settle. If effects keep triggering each other more than **100** times in one flush, throw an `Error` whose message contains `Cycle`.

### `batch(fn)`
- Runs `fn` and returns its result. Effects triggered inside run **once**, after the outermost batch ends.
- Reading signals or computeds inside the batch gives the fresh values.

### `untracked(fn)`
- Runs `fn` and returns its result. Reads inside it don't create dependencies.

## Glitch-free updates

In a diamond `a → b, a → c, (b, c) → d`, changing `a` must compute `d` **once**, and no effect may ever see `b` and `c` from different moments.

## Notes
- Everything lives in one file. Global state is fine, since each test gets a fresh copy of your module.
- Effects run synchronously: after a write outside a batch, the effected code has already run when the assignment returns.
