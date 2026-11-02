import type { Clock, TimeoutOptions } from './types';

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, options: TimeoutOptions = {}): Promise<T> {
  throw new Error('Not implemented');
}
