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

/**
 * @contract createVirtualizer, Virtualizer.measure
 * @change `measure` returns the scroll adjustment, and the virtualizer gains `scrollToIndex(index, opts)`.
 * Your `createVirtualizer` doesn't return the stage 3 `measure` or `scrollToIndex` yet. Return a `Virtualizer` (from `./types`).
 */
export function scrolled(options: VirtualizerOptions): number {
  const v = createVirtualizer(options);
  const adjust: number = v.measure(0, 40, 100);
  return adjust + v.scrollToIndex(10, { align: 'center', scrollTop: 100 });
}
