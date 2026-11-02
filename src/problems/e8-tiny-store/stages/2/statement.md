# Tiny store + persist: selectors

Add selector subscriptions.

```ts
api.subscribe((s) => s.count, (count, prevCount) => render(count));
api.subscribe((s) => s.items, onItems, { equalityFn: shallow, fireImmediately: true });
```

```ts
subscribe<U>(
  selector: (state: T) => U,
  listener: (slice: U, prev: U) => void,
  options?: { equalityFn?: (a: U, b: U) => boolean; fireImmediately?: boolean },
): () => void
```

- The selector runs at subscribe time and after every state change.
- The listener is called with `(slice, prevSlice)` only when the new slice differs from the last one according to `equalityFn` (default `Object.is`). The last slice is updated only when the listener fires.
- `fireImmediately` calls the listener once at subscribe time with `(slice, slice)`.
- `subscribe(listener)` with one argument still works as before.
