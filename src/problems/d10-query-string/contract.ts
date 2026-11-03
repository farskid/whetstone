// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { parse, stringify } from './solution';

/**
 * @contract stringify
 * @change `stringify` takes a second argument, `opts: StringifyOptions`, with the array format.
 * Your `stringify` doesn't take options yet. Add `opts: StringifyOptions = {}` (from `./types`).
 */
export function bracketArrays(): string {
  return stringify({ tags: ['a', 'b'] }, { arrayFormat: 'brackets' });
}

/**
 * @contract parse
 * @change `parse` takes a second argument, `opts: ParseOptions`, with the depth and limits.
 * Your `parse` doesn't take options yet. Add `opts: ParseOptions = {}` (from `./types`).
 */
export function shallow() {
  return parse('a[b][c]=1', { depth: 1, parameterLimit: 10, arrayLimit: 5 });
}
