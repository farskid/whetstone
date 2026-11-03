// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createHistory } from './solution';

/**
 * @contract createHistory, History.push
 * @change `createHistory` takes `options: HistoryOptions`, and `push` takes `options: PushOptions`.
 * Your `createHistory` or `push` doesn't take options yet. Add `options: HistoryOptions = {}` and `options?: PushOptions` (from `./types`).
 */
export function coalescing() {
  createHistory(0, { capacity: 10, coalesceMs: 500 }).push(1, { groupKey: 'typing' });
}
