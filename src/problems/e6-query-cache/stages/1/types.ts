/** A query key: an array whose elements are hashed with sorted object keys. */
export type QueryKey = readonly unknown[];

/** Fetches a query's data. `signal` is never aborted in this stage. */
export type QueryFn<T> = (ctx: { queryKey: QueryKey; signal: AbortSignal }) => Promise<T>;

/** A snapshot of one query. */
export interface QueryState<T> {
  /** `pending` = no data yet and no error. */
  status: 'pending' | 'success' | 'error';
  fetchStatus: 'fetching' | 'idle';
  data: T | undefined;
  /** `undefined` unless status is `error`. */
  error: unknown;
  /** `clock.now()` of the last successful data; 0 if none. */
  updatedAt: number;
  isStale: boolean;
}

/** Time source for `updatedAt`. Defaults to `Date.now`. */
export interface Clock { now(): number }

/** Client options. */
export interface QueryClientOptions {
  clock?: Clock;
}

/** What `createQueryClient` returns. */
export interface QueryClient {
  fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T>;
  getQueryData<T>(key: QueryKey): T | undefined;
  /** `undefined` if the key isn't in the cache. */
  getState<T>(key: QueryKey): QueryState<T> | undefined;
}
