Add **observers** and **invalidation**, including the race where an old response arrives after a newer one.

```ts
const stop = client.watch(['todos', { done: false }], fetchTodos, (state) => render(state));
await client.invalidateQueries(['todos']);   // refetches every observed ['todos', ...] query
stop();
```

```ts
// QueryClient gains:
watch<T>(key: QueryKey, fn: QueryFn<T>, listener: (state: QueryState<T>) => void): () => void;
invalidateQueries(prefix: QueryKey): Promise<void>;
```

**`watch(key, fn, listener)`**
- Registers an observer. If the query has no data or is stale, it starts a fetch (deduped as before). <!-- tests: watch fetches, then notifies on every state change | watch on fresh cached data does not refetch -->
- `listener` runs with the new state after **every** state change: fetch start, success, error, `setQueryData` and invalidation. It doesn't run synchronously inside `watch` itself. <!-- tests: watch fetches, then notifies on every state change -->
- Returns an unsubscribe function.
- The query remembers the latest `fn` it was given, for refetches.

**`invalidateQueries(prefix)`**
- Every cached query whose key starts with `prefix` (element-wise, each element compared by `hashKey`) becomes **stale**. `[]` matches everything; `['todos']` doesn't match `['todosX']`. <!-- tests: invalidateQueries matches by prefix and refetches only observed queries -->
- Data is now also stale if it was invalidated after it was last updated. A fetch that was already in flight when the invalidation happened leaves the data stale; `setQueryData` makes it fresh. <!-- tests: invalidating while a fetch is in flight keeps the result stale -->
- Queries that have observers are refetched now. If one is already fetching, **abort** that fetch through its `signal` and start a new one. <!-- tests: invalidateQueries matches by prefix and refetches only observed queries | invalidation aborts the in-flight fetch; the stale response is ignored -->
- The aborted fetch's result or error is **ignored**: a superseded response can never overwrite newer data. Anyone awaiting the old fetch gets the new fetch's outcome instead. <!-- tests: invalidation aborts the in-flight fetch; the stale response is ignored -->
- Unobserved matches are only marked stale; their next `fetchQuery` refetches. <!-- tests: invalidateQueries matches by prefix and refetches only observed queries -->
- The returned promise settles once every refetch it started has settled. It never rejects.
