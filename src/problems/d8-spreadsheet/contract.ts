// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createSheet } from './solution';

/**
 * @contract Sheet.set
 * @change `set` returns the addresses whose value changed.
 * Your `set` doesn't return `string[]` yet. Return the changed addresses, sorted by row then column.
 */
export function changedCells(): string[] {
  return createSheet().set('A1', 1);
}

// @contract-skip ErrorCode: adds '#CYCLE!', a value your code returns; the tests check it.
