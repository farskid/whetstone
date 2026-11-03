import type { Mutation, QueueOptions, OfflineQueue, EnqueueOptions } from './types';

export function createOfflineQueue(options: QueueOptions): OfflineQueue {
  return {
    enqueue(type: string, payload: unknown, opts: EnqueueOptions = {}): number {
      throw new Error('Not implemented');
    },
    setOnline(online: boolean): void {
      throw new Error('Not implemented');
    },
    pending(): Mutation[] {
      throw new Error('Not implemented');
    },
  };
}
