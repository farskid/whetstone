// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createLimiter } from './solution';
import type { RunOptions } from './types';

/**
 * @contract Limiter.run
 * @change `run` takes a second argument, `options?: RunOptions`.
 * Your limiter's `run` doesn't take `options` yet: stage 3 adds `run(fn, options?: RunOptions)`.
 */
export function runTakesOptions(options: RunOptions) {
  return createLimiter(1).run(() => 1, options);
}
