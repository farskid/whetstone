// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createVirtualizer } from './solution';
import type { VirtualizerOptions } from './types';

/**
 * @contract createVirtualizer
 * @change The virtualizer gains `measure(index, size)`.
 * Your `createVirtualizer` doesn't return `measure` yet. Return a `Virtualizer` (from `./types`).
 */
export function measured(options: VirtualizerOptions) {
  createVirtualizer(options).measure(0, 40);
}
