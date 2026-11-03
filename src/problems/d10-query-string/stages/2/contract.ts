// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { stringify } from './solution';

/**
 * @contract stringify
 * @change `stringify` takes a second argument, `opts: StringifyOptions`, with the array format.
 * Your `stringify` doesn't take options yet. Add `opts: StringifyOptions = {}` (from `./types`).
 */
export function bracketArrays(): string {
  return stringify({ tags: ['a', 'b'] }, { arrayFormat: 'brackets' });
}

// @contract-skip parse: widens an output to nested `Value`s.
