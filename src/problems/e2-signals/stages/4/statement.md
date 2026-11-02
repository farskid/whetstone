Add **`untracked(fn)`**, dynamic dependencies, errors and cycle detection.

```ts
function untracked<T>(fn: () => T): T;

const useA = signal(true), a = signal('a1'), b = signal('b1');
effect(() => console.log(useA.value ? a.value : b.value));
useA.value = false;   // "b1": the effect now depends on useA and b only
a.value = 'a2';       // nothing
```

- **Dynamic dependencies:** only what the latest run of an effect or computed read counts.
- **`untracked(fn)`** runs `fn` and returns its result. Reads inside it don't create dependencies (like `.peek()`).
- **Errors:** if a computed's `fn` throws, reading `.value` re-throws that error, every time, until a dependency changes and it recomputes.
- A computed that reads itself, directly or through other computeds, throws an `Error` whose message contains `Cycle`.
- An effect may write to signals, including ones it reads. It re-runs until things settle. If effects keep triggering each other more than **100** times in one flush, throw an `Error` whose message contains `Cycle`.
