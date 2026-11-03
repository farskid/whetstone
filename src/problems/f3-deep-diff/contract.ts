// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { diff } from './solution';

/**
 * @contract diff
 * @change `diff` takes a third argument, `options: DiffOptions`, with `objectHash`.
 * Your `diff` doesn't take options yet. Add `options: DiffOptions = {}` (from `./types`).
 */
export function byId() {
  return diff([{ id: 1 }], [{ id: 1 }], { objectHash: (item, index) => String((item as { id?: number }).id ?? index) });
}
