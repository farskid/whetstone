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

/**
 * @contract createOfflineQueue, OfflineQueue.enqueue
 * @change `enqueue` takes a third `opts` argument: `{ dedupeKey }`.
 * Your `enqueue` doesn't take `opts` yet. Type it as `opts: EnqueueOptions = {}` (from `./types`).
 */
export function coalesces(options: QueueOptions): number {
  return createOfflineQueue(options).enqueue('note.update', { id: 7 }, { dedupeKey: 'note:7' });
}
