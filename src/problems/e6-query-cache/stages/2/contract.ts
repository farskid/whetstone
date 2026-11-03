// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createQueryClient } from './solution';

/**
 * @contract createQueryClient
 * @change The client gains `setQueryData(key, updater)`.
 * Your `createQueryClient` doesn't return `setQueryData` yet. Return a `QueryClient` (from `./types`).
 */
export function seed() {
  createQueryClient({ staleTime: 1000 }).setQueryData<number>(['count'], (old) => (old ?? 0) + 1);
}
