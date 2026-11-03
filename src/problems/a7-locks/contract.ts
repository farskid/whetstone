// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { Mutex, Semaphore } from './solution';
import type { AcquireOptions, LockOptions } from './types';

/**
 * @contract Semaphore.constructor, Mutex.constructor
 * @change `new Semaphore(capacity, options?)` and `new Mutex(options?)` take `LockOptions` (a `clock`).
 * Your `Semaphore` or `Mutex` constructor doesn't take `options: LockOptions` yet (from `./types`).
 */
export function constructWithOptions(options: LockOptions) {
  return [new Semaphore(2, options), new Mutex(options)];
}

/**
 * @contract Semaphore.acquire, Mutex.acquire
 * @change `acquire` takes `AcquireOptions` (a `timeout`): `semaphore.acquire(weight?, options?)`, `mutex.acquire(options?)`.
 * Your `acquire` doesn't take `options: AcquireOptions` yet (from `./types`).
 */
export function acquireWithOptions(semaphore: Semaphore, mutex: Mutex, options: AcquireOptions) {
  return [semaphore.acquire(1, options), mutex.acquire(options)];
}
