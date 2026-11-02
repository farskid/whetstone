/** A queued write. `pending()` and `send()` get copies. */
export interface Mutation {
  id: number;
  type: string;
  payload: unknown;
  /** Always 0 in this stage. */
  attempts: number;
}

export interface QueueOptions {
  send(m: Mutation): Promise<unknown>;
  /** Passed in by callers but not used until stage 2. */
  storage: unknown;
}
