// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { AsyncSeriesHook, SyncHook } from './solution';
import type { TapOptions } from './types';

/**
 * @contract TapOptions
 * @change `TapOptions` gains `stage?: number` and `before?: string | string[]`.
 * Your `tap` or `tapPromise` doesn't take the stage 4 `TapOptions` (with `stage` and `before`) yet. Type it `options: TapOptions` (from `./types`).
 */
export function tapsWithStage(options: TapOptions) {
  new SyncHook<[number]>().tap(options, () => {});
  new AsyncSeriesHook<[number]>().tapPromise({ name: 'b', stage: -1, before: ['a'] }, async () => {});
}
// @contract-skip TapInfo: before stage 4 it was your own internal type; stage 4 makes it the shape interceptors receive.
