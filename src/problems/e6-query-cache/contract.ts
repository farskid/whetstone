// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createQueryClient } from './solution';
import type { QueryFn } from './types';

/**
 * @contract createQueryClient
 * @change The client gains `setQueryData(key, updater)`.
 * Your `createQueryClient` doesn't return `setQueryData` yet. Return a `QueryClient` (from `./types`).
 */
export function seed() {
  createQueryClient({ staleTime: 1000 }).setQueryData<number>(['count'], (old) => (old ?? 0) + 1);
}

/**
 * @contract createQueryClient
 * @change The client gains `watch(key, fn, listener)` and `invalidateQueries(prefix)`.
 * Your `createQueryClient` doesn't return `watch` or `invalidateQueries` yet. Return a `QueryClient` (from `./types`).
 */
export function observe(fn: QueryFn<number>): Promise<void> {
  const client = createQueryClient();
  const stop: () => void = client.watch(['count'], fn, (state) => state.data);
  stop();
  return client.invalidateQueries(['count']);
}
