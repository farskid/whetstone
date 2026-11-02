import type { Clock, RetryOptions } from './types';

export function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  throw new Error('Not implemented');
}
