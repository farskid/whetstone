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
