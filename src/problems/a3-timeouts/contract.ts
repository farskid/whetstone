// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { withTimeout } from './solution';
import type { TimeoutInput, TimeoutOptions } from './types';

/**
 * @contract TimeoutInput, withTimeout
 * @change `TimeoutInput<T>` widens to `Promise<T> | ((signal: AbortSignal) => Promise<T>)`, so `withTimeout`'s first argument can be a task function.
 * Your `withTimeout` doesn't accept a task function as its first argument yet. Type it `input: TimeoutInput<T>` (from `./types`).
 */
export const takesInput: <T>(input: TimeoutInput<T>, ms: number, options?: TimeoutOptions<T>) => Promise<T> = withTimeout;
export function takesTask() {
  return withTimeout(async (signal: AbortSignal) => signal.aborted, 100);
}
