Return a function with two methods:

```ts
interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
  pending(): boolean;
}

function debounce<A extends unknown[]>(fn: (...args: A) => unknown, wait: number, options?: DebounceOptions): Debounced<A>;
```

- `cancel()` drops any scheduled trailing call and ends the current burst, so the next call starts a fresh burst.
- `pending()` is `true` when a trailing call is scheduled and hasn't run yet.
