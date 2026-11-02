import type { Mutation, QueueOptions } from './types';

export function createOfflineQueue(options: QueueOptions) {
  return {
    enqueue(type: string, payload: unknown, opts: { dedupeKey?: string } = {}): number {
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
