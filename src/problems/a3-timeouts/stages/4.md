Write `anySignal`, like **AbortSignal.any**.

```ts
const signal = anySignal([userCancel.signal, routeChange.signal]);

function anySignal(signals: AbortSignal[]): AbortSignal;
```

- Returns a new signal that aborts as soon as **any** input aborts, with that input's `reason`. Later aborts don't change it.
- If an input is already aborted, the result is aborted right away with the first such input's reason (in array order).
- Once it has aborted, it removes every listener it added to the inputs.
- `anySignal([])` returns a signal that never aborts.
