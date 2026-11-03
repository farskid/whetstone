Add **staleness**, so cached data expires, and **`setQueryData`** to write the cache directly.

```ts
const client = createQueryClient({ staleTime: 1000, clock });
await client.fetchQuery(['k'], fn);   // t=0: fetches
await client.fetchQuery(['k'], fn);   // t=999: fresh, from the cache
await client.fetchQuery(['k'], fn);   // t=1000: stale, fetches again
client.setQueryData(['k'], (old) => old + 1);
```

```ts
// options gain:  staleTime?: number   (default 0: data is stale immediately)
// client gains:
setQueryData<T>(key: QueryKey, updater: T | ((old: T | undefined) => T)): void;
```

- Data is **stale** if there is none, or if `now - updatedAt >= staleTime`. `isStale` reports this. <!-- tests: staleTime: fresh data is served, stale data is refetched -->
- `fetchQuery` serves cached data only while it is fresh. Stale data is refetched. An in-flight fetch is still shared, fresh or not. <!-- tests: staleTime: fresh data is served, stale data is refetched -->
- With the default `staleTime` of `0`, every `fetchQuery` that isn't deduped calls `fn`. <!-- tests: default staleTime 0 refetches every time -->
- `setQueryData(key, updater)` writes data. A function updater gets the old data (`undefined` if none). It creates the query if needed, sets `status: 'success'` and `updatedAt = now`, and clears `error`. <!-- tests: setQueryData seeds the cache and clears an error -->
