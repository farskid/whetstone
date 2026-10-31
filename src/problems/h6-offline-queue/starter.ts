export interface Mutation {
  id: number;
  type: string;
  payload: unknown;
  dedupeKey?: string;
  attempts: number;
}

export type Outcome = { ok: true; value: unknown } | { ok: false; error: unknown };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface QueueOptions {
  send(m: Mutation): Promise<unknown>;
  storage: StorageLike;
  storageKey?: string;
  online?: boolean;
  maxRetries?: number;
  retryDelay?: (attempt: number) => number;
  isRetryable?: (error: unknown) => boolean;
  onSettled?: (m: Mutation, outcome: Outcome) => void;
  clock?: { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(id: unknown): void };
}

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
