import type { State, BreakerOptions, BreakerEvent } from './types';

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
