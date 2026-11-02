import type { State, BreakerOptions } from './types';

export class OpenCircuitError extends Error {
  constructor() {
    super('Breaker is open');
    this.name = 'OpenCircuitError';
  }
}

export class CircuitBreaker<A extends unknown[], R> {
  constructor(fn: (...args: A) => Promise<R>, options: BreakerOptions = {}) {
    throw new Error('Not implemented');
  }

  get state(): State {
    throw new Error('Not implemented');
  }

  fire(...args: A): Promise<R> {
    throw new Error('Not implemented');
  }
}
