export type QueryKey = readonly unknown[];
export type QueryFn<T> = (ctx: { queryKey: QueryKey; signal: AbortSignal }) => Promise<T>;

export interface QueryState<T> {
  status: 'pending' | 'success' | 'error';
  fetchStatus: 'fetching' | 'idle';
  data: T | undefined;
  error: unknown;
  updatedAt: number;
  isStale: boolean;
}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface QueryClientOptions {
  staleTime?: number;
  gcTime?: number;
  retry?: number;
  retryDelay?: (failureCount: number) => number;
  clock?: Clock;
}

export function hashKey(key: QueryKey): string {
  throw new Error('Not implemented');
}

export function createQueryClient(options: QueryClientOptions = {}) {
  return {
    fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T> {
      throw new Error('Not implemented');
    },
    watch<T>(key: QueryKey, fn: QueryFn<T>, listener: (state: QueryState<T>) => void): () => void {
      throw new Error('Not implemented');
    },
    async invalidateQueries(prefix: QueryKey): Promise<void> {
      throw new Error('Not implemented');
    },
    setQueryData<T>(key: QueryKey, updater: T | ((old: T | undefined) => T)): void {
      throw new Error('Not implemented');
    },
    getQueryData<T>(key: QueryKey): T | undefined {
      throw new Error('Not implemented');
    },
    getState<T>(key: QueryKey): QueryState<T> | undefined {
      throw new Error('Not implemented');
    },
  };
}
