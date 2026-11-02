# Tiny store + persist: persist

Add the `persist` middleware, which saves state to a storage and restores it.

```ts
const api = create(persist((set) => ({
  items: [] as string[],
  add: (id: string) => set((s) => ({ items: [...s.items, id] })),
}), { name: 'cart', storage: localStorage }));
await api.persist.whenHydrated();
```

`persist(initializer, options)` returns an initializer to pass to `create`.

| Option | Meaning |
| --- | --- |
| `name` | The storage key. |
| `storage` | `{ getItem, setItem, removeItem }`, sync or async. |
| `version` | Defaults to `0`. |
| `migrate(state, storedVersion)` | Converts state saved under another version. May be async. |
| `partialize(state)` | What gets saved. Defaults to the whole state; functions disappear in JSON. |
| `merge(persisted, current)` | Defaults to `{ ...current, ...persisted }`. |
| `onHydrated(state, error?)` | Called when hydration finishes. |

**Storage**
- The value stored is `JSON.stringify({ state: partialize(state), version })`.
- Every change made through `set` or `api.setState` after hydration writes it. Hydration itself does not write.
- No storage writes happen before hydration is done. In this stage, changes made before then may be overwritten by the persisted values.

**Hydration**
- Hydration starts at creation but is **always asynchronous**: right after `create`, `api.persist.hasHydrated()` is `false`, even with a synchronous storage.
- When it finishes, the store holds `merge(persisted, current)` (listeners are notified), then `onHydrated` is called and `whenHydrated()` promises resolve.
- If nothing is stored, the state stays as it is.
- If the stored version differs: with a `migrate`, use its result; without one, ignore the stored state.
- If the stored value isn't valid JSON or isn't an object with a `state`, keep the current state. Hydration still completes, and `onHydrated` receives an `Error`.

`api.persist`:

| Method | Behavior |
| --- | --- |
| `hasHydrated()` | Whether hydration has finished. |
| `whenHydrated()` | A promise that resolves once hydration has finished. |
| `rehydrate()` | Runs hydration again. |
| `clearStorage()` | Removes the key from storage. |
