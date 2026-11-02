import type { QueryKey, QueryFn, QueryState, QueryClientOptions } from './types';

export function hashKey(key: QueryKey): string {
  throw new Error('Not implemented');
}

export function createQueryClient(options: QueryClientOptions = {}) {
  return {
    fetchQuery<T>(key: QueryKey, fn: QueryFn<T>): Promise<T> {
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
