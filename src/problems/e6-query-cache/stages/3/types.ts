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
