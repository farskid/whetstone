/** Injected time in ms. Stage 1 doesn't use it yet. */
export interface Clock {
  now(): number;
}

/** Stage 1 has no way back from open. */
export type State = 'closed' | 'open';

export interface BreakerOptions {
  clock?: Clock;
  /** Consecutive failures that open the circuit (default 5). */
  failureThreshold?: number;
}
