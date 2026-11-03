// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { runTaskGraph } from './solution';
import type { Options, Task } from './types';

/**
 * @contract runTaskGraph
 * @change `runTaskGraph` takes a second argument, `options?: Options`.
 * Your `runTaskGraph` doesn't take `options: Options` yet (from `./types`).
 */
export function takesOptions(tasks: Task[], options: Options) {
  return runTaskGraph(tasks, options);
}
// @contract-skip Report.status: a status can now be 'failed' or 'skipped' too; that only widens what you return, and the tests check it.
