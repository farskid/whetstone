// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createOfflineQueue } from './solution';
import type { QueueOptions } from './types';

/**
 * @contract createOfflineQueue
 * @change The queue gains `setOnline(online)`.
 * Your `createOfflineQueue` doesn't return `setOnline` yet. Return an `OfflineQueue` (from `./types`).
 */
export function goesOffline(options: QueueOptions) {
  createOfflineQueue(options).setOnline(false);
}
