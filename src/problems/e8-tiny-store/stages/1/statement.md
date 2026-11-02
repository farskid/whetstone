# Tiny store + persist

Build a Zustand-style store. This stage covers `create`, `setState` and plain listeners.

```ts
const api = create((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));
api.subscribe((state, prev) => console.log(prev.count, '->', state.count));
api.getState().inc(); // logs 0 -> 1
```

```ts
create<T>(initializer: (set, get, api) => T): StoreApi<T>

interface StoreApi<T> {
  getState(): T;
  setState(partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}
```

- `initializer(set, get, api)` returns the initial state. `set` behaves like `api.setState`, and `get` like `api.getState`.
- `setState` accepts a partial or a function of the current state that returns one.
- The partial is shallow-merged into a **new** state object; the old state is never mutated. With `replace`, the partial becomes the whole state.
- If the partial (or the function's result) is `Object.is`-equal to the current state, nothing happens and no listener is called.
- Otherwise every listener is called with `(state, prev)`.
- `subscribe` returns an unsubscribe function.
