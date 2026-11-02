/** A queued write. `pending()` and `send()` get copies. */
export interface Mutation {
  id: number;
  type: string;
  payload: unknown;
  /** Failed sends so far. Nothing fails before stage 3, so new mutations keep 0; restored ones keep the stored value. */
  attempts: number;
}

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
}
