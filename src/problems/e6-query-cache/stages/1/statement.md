Build the core of **TanStack Query** or **SWR**: a cache for server data, keyed by array keys, that never runs the same request twice at once.

```ts
const client = createQueryClient();
const p1 = client.fetchQuery(['user', { id: 1, v: 2 }], fetchUser);
const p2 = client.fetchQuery(['user', { v: 2, id: 1 }], fetchUser);  // same key: deduped
await p1;                                                             // fetchUser ran once
await client.fetchQuery(['user', { id: 1, v: 2 }], fetchUser);       // served from the cache
```

```ts
type QueryKey = readonly unknown[];
type QueryFn<T> = (ctx: { queryKey: QueryKey; signal: AbortSignal }) => Promise<T>;

function hashKey(key: QueryKey): string;
function createQueryClient(options?: { clock?: { now(): number } }): {
  fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T>;
  getQueryData<T>(key: QueryKey): T | undefined;
  getState<T>(key: QueryKey): QueryState<T> | undefined;   // undefined if not in the cache
};
```

`QueryState` is `{ status, fetchStatus, data, error, updatedAt, isStale }` (see the types file).

**Keys.** `hashKey` is a deterministic JSON hash where plain-object keys are **sorted** at every depth, so `['todos', { a: 1, b: 2 }]` and `['todos', { b: 2, a: 1 }]` are the same query. Everything else follows `JSON.stringify`: arrays keep their order, `1` and `'1'` differ, and nesting matters. <!-- tests: hashKey sorts object keys at every depth -->

**`fetchQuery(key, fn)`**
- If a fetch for the key is already in flight, return a promise for that fetch's outcome. Never start a second one. <!-- tests: concurrent fetches of the same key are deduped -->
- Otherwise, if the query has data, resolve with it and **don't** call `fn`. In this stage cached data never goes stale. <!-- tests: fetchQuery caches by key and resolves data -->
- Otherwise call `fn({ queryKey: key, signal })` (`signal` is an `AbortSignal` that is never aborted here). The promise resolves with the data or rejects with the error.
- A query enters the cache when its first fetch starts.

**State**
- Before any data: `status: 'pending'`, `data: undefined`, `updatedAt: 0`.
- `fetchStatus` is `'fetching'` while a fetch is in flight, else `'idle'`.
- On success: `status: 'success'`, `data` set, `error: undefined`, `updatedAt = clock.now()` (`clock` defaults to `Date.now`).
- On failure: `status: 'error'`, `error` set, any old `data` is **kept**.
- `isStale` is `true` only while the query has no data.
- `getQueryData(key)` returns the cached data, or `undefined`.
