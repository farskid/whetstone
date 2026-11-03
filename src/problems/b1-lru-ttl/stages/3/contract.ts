// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { LRUCache } from './solution';
import type { SetOptions } from './types';

/**
 * @contract LRUCache.set
 * @change `set` takes a third argument, `options?: SetOptions` (a per-entry `ttl`).
 * Your `set` doesn't take `options: SetOptions` yet (from `./types`).
 */
export function setTakesOptions(cache: LRUCache<string, number>, options: SetOptions) {
  return cache.set('k', 1, options);
}
