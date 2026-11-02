import type { Clock, FailedAttempt, RetryOptions } from './types';

export class AbortError extends Error {
  readonly originalError: Error;
  constructor(errorOrMessage: Error | string) {
    super(typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage.message);
    this.name = 'AbortError';
    this.originalError = typeof errorOrMessage === 'string' ? this : errorOrMessage;
  }
}

export function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  throw new Error('Not implemented');
}
