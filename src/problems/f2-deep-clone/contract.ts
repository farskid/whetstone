// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { clone } from './solution';

/**
 * @contract clone
 * @change `clone` takes a second argument, `options: CloneOptions`.
 * Your `clone` doesn't take options yet. Add `options: CloneOptions = {}` (from `./types`).
 */
export function withOptions(): Date {
  return clone(new Date(0), { keepPrototype: true, customizer: () => undefined });
}
