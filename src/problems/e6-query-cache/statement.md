# Query cache

Build the core of **TanStack Query** or **SWR**: a cache for server data, keyed by array keys. It dedupes requests, knows when data is stale, notifies observers, and handles invalidation races.

```ts
const client = createQueryClient({ staleTime: 1000, retry: 2 });

const stop = client.watch(['todos', { done: false }], fetchTodos, (state) => render(state));
await client.fetchQuery(['todos', { done: false }], fetchTodos); // deduped / served from cache
await client.invalidateQueries(['todos']);  // refetches every active ['todos', ...] query
stop();                                      // removed after gcTime with no observers
```

## API

```ts
type QueryKey = readonly unknown[];
type QueryFn<T> = (ctx: { queryKey: QueryKey; signal: AbortSignal }) => Promise<T>;

interface QueryState<T> {
  status: 'pending' | 'success' | 'error';   // pending = no data yet and no error
  fetchStatus: 'fetching' | 'idle';
  data: T | undefined;
  error: unknown;                               // undefined unless status is 'error'
  updatedAt: number;                            // clock.now() of the last successful data, 0 if none
  isStale: boolean;
}

function hashKey(key: QueryKey): string;
function createQueryClient(options?: {
  staleTime?: number;                          // default 0 (data is stale immediately)
  gcTime?: number;                             // default 300_000
  retry?: number;                              // extra attempts after a failure, default 0
  retryDelay?: (failureCount: number) => number; // default n => 1000 * 2 ** (n - 1)
  clock?: { now(): number; setTimeout(fn: () => void, ms: number): unknown; clearTimeout(id: unknown): void };
}): {
  fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T>;
  watch<T>(key: QueryKey, fn: QueryFn<T>, listener: (state: QueryState<T>) => void): () => void;
  invalidateQueries(prefix: QueryKey): Promise<void>;
  setQueryData<T>(key: QueryKey, updater: T | ((old: T | undefined) => T)): void;
  getQueryData<T>(key: QueryKey): T | undefined;
  getState<T>(key: QueryKey): QueryState<T> | undefined;   // undefined if not in the cache
};
```

## Rules

**Keys.** `hashKey` is a deterministic JSON-like hash where plain-object keys are **sorted** at every depth. `['todos', { a: 1, b: 2 }]` and `['todos', { b: 2, a: 1 }]` are the same query. Use `undefined` → `null` semantics like JSON.

**`fetchQuery`**
- If the query has data and isn't stale, resolve with the cached data and **don't** call `fn`.
- If a fetch is already in flight, return a promise for that fetch's outcome. Never start a second fetch.
- Otherwise start a fetch. The promise resolves with the data or rejects with the final error.

**Staleness.** Data is stale if there is none, if `now - updatedAt >= staleTime`, or if it was invalidated after it was last updated.

**Retries.** On failure, wait `retryDelay(failureCount)` on the clock (`failureCount` is 1 for the first retry), then call `fn` again. Do this up to `retry` times. Only the final failure counts: status becomes `'error'`, `error` is set, and any old `data` is **kept**. While retrying, `fetchStatus` stays `'fetching'`.

**`watch`**
- Registers an observer. If the query has no data or is stale, it starts a fetch (deduped as above).
- `listener` runs with the new state after **every** state change: fetch start, success, error, `setQueryData` and invalidation. It doesn't run synchronously inside `watch` itself.
- Returns an unsubscribe function.

**`invalidateQueries(prefix)`**
- Every cached query whose key starts with `prefix` (element-wise, compared by hash) becomes stale.
- Queries that have observers are refetched now. If such a query is already fetching, **abort** that fetch through its `signal` and start a new one.
- The aborted fetch's result or error must be **ignored**: a superseded response can never overwrite newer data. Anyone awaiting the old fetch gets the new fetch's outcome instead.
- The returned promise settles once every refetch it started has settled. It never rejects.

**`setQueryData`** writes data (function updaters get the old data), sets status `'success'` and `updatedAt = now`, clears `error`, and notifies.

**Garbage collection.** A query with no observers and no fetch in flight is removed after `gcTime` (start the timer when it reaches that state). A new observer or fetch cancels the timer. After removal, `getState` returns `undefined`.
