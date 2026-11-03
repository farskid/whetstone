// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { Loader } from './solution';
import type { BatchFn } from './types';

/**
 * @contract Loader.constructor
 * @change The constructor takes a second `options` argument: `{ cache, maxBatchSize, batchScheduleFn }`.
 * Your `Loader` constructor doesn't take `options` yet. Type it as `options: LoaderOptions = {}` (from `./types`).
 */
export function withOptions(batchFn: BatchFn<string, number>) {
  new Loader(batchFn, { cache: false, maxBatchSize: 10, batchScheduleFn: (dispatch) => dispatch() });
}

/**
 * @contract Loader, Loader.constructor, LoaderOptions
 * @change `Loader` gains a cache-key type `C`, and options gain `cacheKeyFn(key)`.
 * Your `Loader` doesn't take a `cacheKeyFn` yet. Declare it as `class Loader<K, V, C = K>` with `options: LoaderOptions<K, C> = {}` (from `./types`).
 */
export function withCacheKey(batchFn: BatchFn<{ id: number }, string>) {
  const loader: Loader<{ id: number }, string, number> = new Loader(batchFn, { cacheKeyFn: (key: { id: number }) => key.id });
  return loader;
}
