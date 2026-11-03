// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createStore } from './solution';
import type { Enhancer } from './types';

/**
 * @contract createStore
 * @change `createStore` takes an enhancer, as the second or third argument.
 * Your `createStore` doesn't take an `Enhancer` yet. Type it `preloadedState?: S | Enhancer, enhancer?: Enhancer` (from `./types`).
 */
export function enhanced(enhancer: Enhancer) {
  const counter = (state: number | undefined) => state ?? 0;
  createStore(counter, enhancer);
  return createStore(counter, 0, enhancer);
}
