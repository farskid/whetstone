# Tiny store + persist: races and tabs

Handle writes made before hydration, overlapping hydrations, and cross-tab sync.

```ts
const api = create(persist(init, { name: 'cart', storage, bus: broadcastChannel }));
api.setState({ a: 100 }); // before hydration: this key wins over the stored value
```

**Writes before hydration finishes**
- Still no storage writes before hydration is done.
- Keys changed before hydration finishes **win** over the persisted values for those keys, even if they were changed back to their original value.
- If anything changed before hydration finished, write once when it completes.

**Overlapping hydrations**
- `rehydrate()` discards the results of an earlier, still-running hydration. Only the latest run updates the state and finishes hydration.

**Cross-tab sync** with the new `bus` option: `{ postMessage({ name, value }), subscribe(handler) }`.
- Every storage write also posts `{ name, value }` on the bus, where `value` is the stored string.
- A store receiving a message for its own `name` (once hydrated) merges that state in with `merge`. Messages for other names are ignored.
- Applying a received message must **not** write to storage or post again (no echo).
- The bus never delivers a store's own messages back to it.
