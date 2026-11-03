# Tiny store + persist: races and tabs

Handle writes made before hydration, overlapping hydrations, and cross-tab sync.

```ts
const api = create(persist(init, { name: 'cart', storage, bus: broadcastChannel }));
api.setState({ a: 100 }); // before hydration: this key wins over the stored value
```

**Writes before hydration finishes**
- Still no storage writes before hydration is done.
- Keys changed before hydration finishes **win** over the persisted values for those keys, even if they were changed back to their original value. <!-- tests: keys set before hydration finishes win, and are written once afterwards -->
- If anything changed before hydration finished, write once when it completes. <!-- tests: keys set before hydration finishes win, and are written once afterwards -->

**Overlapping hydrations**
- `rehydrate()` discards the results of an earlier, still-running hydration. Only the latest run updates the state and finishes hydration. <!-- tests: rehydrate discards an earlier in-flight hydration -->

**Cross-tab sync** with the new `bus` option: `{ postMessage({ name, value }), subscribe(handler) }`.
- Every storage write also posts `{ name, value }` on the bus, where `value` is the stored string. <!-- tests: cross-tab sync applies remote state without echo -->
- A store receiving a message for its own `name` (once hydrated) merges that state in with `merge`. Messages for other names are ignored. <!-- tests: cross-tab sync applies remote state without echo -->
- Applying a received message must **not** write to storage or post again (no echo). <!-- tests: cross-tab sync applies remote state without echo -->
- The bus never delivers a store's own messages back to it.
