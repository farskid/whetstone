// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { pMap } from './solution';
import type { PMapInput } from './types';

/**
 * @contract PMapInput, pMap
 * @change `PMapInput<T>`, what `pMap` maps over, widens to take an `AsyncIterable<T>` too.
 * Your `pMap` doesn't accept an async iterable yet. Type its input `input: PMapInput<T>` (from `./types`).
 */
export async function* items() { yield 1; }
export function takesAsyncIterable() {
  return pMap(items(), (n: number) => n);
}
