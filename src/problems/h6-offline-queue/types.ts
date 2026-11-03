/** A queued write. `pending()` and `send()` get copies. */
export interface Mutation {
  id: number;
  type: string;
  payload: unknown;
  dedupeKey?: string;
  attempts: number;
}

export type Outcome = { ok: true; value: unknown } | { ok: false; error: unknown };

/** The part of localStorage the queue uses. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface QueueOptions {
  send(m: Mutation): Promise<unknown>;
  storage: StorageLike;
  /** Default 'offline-queue'. */
  storageKey?: string;
  /** Initial connectivity (default true). */
  online?: boolean;
  /** Default 3. */
  maxRetries?: number;
  /** Default n => 1000 * 2 ** (n - 1). */
  retryDelay?: (attempt: number) => number;
  /** Default: true unless error.status is 400–499. */
  isRetryable?: (error: unknown) => boolean;
  /** Called once per mutation that leaves the queue. */
  onSettled?: (m: Mutation, outcome: Outcome) => void;
  clock?: { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void };
}

/** Options for `enqueue`. */
export interface EnqueueOptions {
  /** A newer mutation with the same key replaces a queued one that isn't in flight. */
  dedupeKey?: string;
}

/** What `createOfflineQueue` returns. */
export interface OfflineQueue {
  /** Returns the id. */
  enqueue(type: string, payload: unknown, opts?: EnqueueOptions): number;
  setOnline(online: boolean): void;
  /** Copies, in queue order, including the one in flight. */
  pending(): Mutation[];
}
