import type { Clock, TimeoutInput, TimeoutOptions } from './types';

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(input: TimeoutInput<T>, ms: number, options: TimeoutOptions<T> = {}): Promise<T> {
  throw new Error('Not implemented');
}
