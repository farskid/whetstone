export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
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
  /** Return true for errors that should not count as failures. */
  errorFilter?: (error: unknown) => boolean;
}

export type BreakerEvent = 'open' | 'halfOpen' | 'close' | 'reject' | 'success' | 'failure' | 'timeout' | 'fallback';

export class OpenCircuitError extends Error {
  constructor() {
    super('Breaker is open');
    this.name = 'OpenCircuitError';
  }
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms} ms`);
    this.name = 'TimeoutError';
  }
}

export class CircuitBreaker<A extends unknown[], R> {
  constructor(fn: (...args: A) => Promise<R>, options: BreakerOptions = {}) {
    throw new Error('Not implemented');
  }

  get state(): State {
    throw new Error('Not implemented');
  }

  /** Returns a function that unsubscribes the listener. */
  on(event: BreakerEvent, listener: (payload?: unknown) => void): () => void {
    throw new Error('Not implemented');
  }

  fallback(fn: (error: unknown, ...args: A) => R | Promise<R>): this {
    throw new Error('Not implemented');
  }

  fire(...args: A): Promise<R> {
    throw new Error('Not implemented');
  }
}
