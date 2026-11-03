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

/**
 * @contract createHistory, History, PushOptions
 * @change `History<S, Sel>` keeps a selection: `createHistory<S, Sel>` and `push(state, { selection })`.
 * Your `createHistory` doesn't take a `Sel` type parameter yet. Type it `createHistory<S, Sel = unknown>(...): History<S, Sel>` (from `./types`).
 */
export function withSelection(): string | undefined {
  const history = createHistory<number, string>(0);
  history.push(1, { selection: 'A1' });
  return history.selection;
}
