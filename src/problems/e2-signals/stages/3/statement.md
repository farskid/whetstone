Add **`batch(fn)`** and make updates **glitch-free**.

```ts
const a = signal(1), b = signal(1);
effect(() => console.log(a.value + b.value));   // 2
batch(() => {
  a.value = 2;
  b.value = 3;      // nothing logged yet
});                 // 5, logged once
```

```ts
function batch<T>(fn: () => T): T;
```

- `batch` runs `fn` and returns its result. Effects triggered inside run **once**, after the **outermost** batch ends (batches can nest).
- Inside a batch, reading a signal or computed gives the fresh value.
- **Glitch-free:** in a diamond `a → b, a → c, (b, c) → d`, one write to `a` computes `d` once, and no effect ever sees `b` and `c` from different moments.
- **Equality cutoff:** if a computed re-computes to an `Object.is`-equal value, effects and computeds that read it don't re-run.
- Chains of computeds (`first, last → full → upper → effect`) update after every change, inside or outside a batch.
