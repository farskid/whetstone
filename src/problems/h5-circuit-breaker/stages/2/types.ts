/** Injected time in ms. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
}

export type State = 'closed' | 'open' | 'halfOpen';

export interface BreakerOptions {
  clock?: Clock;
  /** Consecutive failures that open the circuit (default 5). */
  failureThreshold?: number;
  /** ms to stay open before going half-open (default 30000). */
  resetTimeout?: number;
  /** Trial calls allowed at once while half-open (default 1). */
  halfOpenMax?: number;
}
