// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { memoizeOne } from './solution';

/**
 * @contract memoizeOne
 * @change `memoizeOne` takes a second argument, `isEqual?: (newArgs: unknown[], lastArgs: unknown[]) => boolean`.
 * Your `memoizeOne` doesn't take `isEqual` yet: stage 2 adds `memoizeOne(fn, isEqual?)`.
 */
export function takesIsEqual() {
  return memoizeOne((n: number) => n, (newArgs: unknown[], lastArgs: unknown[]) => newArgs[0] === lastArgs[0]);
}
