/** A query key: an array whose elements are hashed with sorted object keys. */
export type QueryKey = readonly unknown[];

/** Fetches a query's data. `signal` aborts when the fetch is superseded. */
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
  /** Data is fresh for this many ms after `updatedAt`. Default 0. */
  staleTime?: number;
  clock?: Clock;
}

/** What `createQueryClient` returns. */
export interface QueryClient {
  fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T>;
  /** Fetches if stale and calls `listener` on every change; returns unsubscribe. */
  watch<T>(key: QueryKey, fn: QueryFn<T>, listener: (state: QueryState<T>) => void): () => void;
  /** Marks every query under `prefix` stale and refetches the watched ones. */
  invalidateQueries(prefix: QueryKey): Promise<void>;
  setQueryData<T>(key: QueryKey, updater: T | ((old: T | undefined) => T)): void;
  getQueryData<T>(key: QueryKey): T | undefined;
  /** `undefined` if the key isn't in the cache. */
  getState<T>(key: QueryKey): QueryState<T> | undefined;
}
