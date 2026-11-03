import type { Mutation, QueueOptions, OfflineQueue } from './types';

export function createOfflineQueue(options: QueueOptions): OfflineQueue {
  return {
    enqueue(type: string, payload: unknown): number {
      throw new Error('Not implemented');
    },
    pending(): Mutation[] {
      throw new Error('Not implemented');
    },
  };
}
