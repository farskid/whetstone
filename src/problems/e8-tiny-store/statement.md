# Tiny store + persist

Build a Zustand-style store and its `persist` middleware.

```ts
const useCart = create(persist((set) => ({
  items: [] as string[],
  add: (id: string) => set((s) => ({ items: [...s.items, id] })),
}), { name: 'cart', storage }));
useCart.getState().add('sku-1');
```

## `create(initializer)`

`initializer(set, get, api)` returns the initial state. `create` returns `api = { getState, setState, subscribe }`, and the `set` passed to the initializer behaves like `api.setState`. A middleware such as `persist` may wrap both.

### `setState(partial | (state) => partial, replace?)`
- The partial is shallow-merged into a **new** state object. With `replace`, it becomes the whole state.
- If the result is `Object.is`-equal to the current state, nothing happens.
- Otherwise every listener is called with `(state, prev)`.

### Subscribing
- `subscribe(listener)` calls the listener on every change.
- `subscribe(selector, listener, { equalityFn = Object.is, fireImmediately })` calls `listener(slice, prevSlice)` only when the selected slice changes according to `equalityFn`.
- `fireImmediately` calls the listener once at subscribe time with `(slice, slice)`.
- Both forms return an unsubscribe function.

## `persist(initializer, options)`

Returns an initializer to pass to `create`.

| Option | Meaning |
| --- | --- |
| `name` | The storage key. |
| `storage` | `{ getItem, setItem, removeItem }`, sync or async. |
| `version` | Defaults to `0`. |
| `migrate(state, storedVersion)` | Converts state saved under another version. |
| `partialize(state)` | What gets saved. Defaults to the whole state; functions disappear in JSON. |
| `merge(persisted, current)` | Defaults to `{ ...current, ...persisted }`. |
| `onHydrated(state, error?)` | Called when hydration finishes. |
| `bus` | `{ postMessage, subscribe }` for cross-tab sync. |

### Storage
- The value stored is `JSON.stringify({ state: partialize(state), version })`.
- Every change made through `set` / `api.setState` **after** hydration writes it.

### Hydration
- Hydration starts at creation but is **always asynchronous**: right after `create`, `api.persist.hasHydrated()` is `false`, even with a synchronous storage.
- When it finishes, the store holds `merge(persisted, current)`, then `onHydrated` is called and `whenHydrated()` promises resolve.

**Versions.** If the stored version differs:
- with a `migrate`, use its (possibly async) result;
- without one, ignore the stored state.

**Corrupt data.** If the stored value isn't valid JSON or has no `state`, keep the current state. Hydration still completes, and `onHydrated` receives the error.

**Writes before hydration finishes**
- No storage writes happen before hydration is done.
- Keys changed before hydration finishes **win** over the persisted values for those keys.
- If anything changed before hydration finished, write once when it completes.

`api.persist`:

| Method | Behavior |
| --- | --- |
| `hasHydrated()` | Whether hydration has finished. |
| `whenHydrated()` | A promise that resolves once hydration has finished. |
| `rehydrate()` | Runs hydration again. Results of an earlier, still-running hydration are discarded. |
| `clearStorage()` | Removes the key from storage. |

### Cross-tab sync
- Every write also posts `{ name, value }` on the bus.
- A store receiving a message for its `name` (once hydrated) merges that state in.
- Applying a received message must **not** write to storage or post again (no echo).
- The bus never delivers a store's own messages back to it.
