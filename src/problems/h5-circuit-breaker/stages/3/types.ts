/** Injected time in ms. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export type State = 'closed' | 'open' | 'halfOpen';

export interface WindowOptions {
  /** How far back the rolling window looks, in ms. */
  durationMs: number;
  /** Open when failures are at least this percentage of calls in the window. */
  errorPercentage: number;
  /** Minimum calls in the window before it can open (default 1). */
  volumeThreshold?: number;
}

export interface BreakerOptions {
  clock?: Clock;
  /** Consecutive failures that open the circuit. Default 5, or off when a window is given. */
  failureThreshold?: number;
  /** ms to stay open before going half-open (default 30000). */
  resetTimeout?: number;
  /** ms before a call counts as failed (default: no timeout). */
  timeout?: number;
  window?: WindowOptions;
  /** Trial calls allowed at once while half-open (default 1). */
  halfOpenMax?: number;
}
