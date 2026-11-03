// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { debounce } from './solution';
import type { Debounced } from './types';

/**
 * @contract Debounced, debounce
 * @change `Debounced<A>`, what `debounce` returns, gains `cancel()` and `pending()`.
 * Your `debounce` doesn't return a `Debounced<A>` with `cancel()` and `pending()` yet. Type its return as `Debounced<A>` (from `./types`).
 */
export const returnsControls: Debounced<[number]> = debounce((n: number) => n, 10);
