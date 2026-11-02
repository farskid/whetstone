import type { Clock, TimeoutOptions } from './types';

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  input: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  ms: number,
  options: TimeoutOptions<T> = {},
): Promise<T> {
  throw new Error('Not implemented');
}

export function anySignal(signals: AbortSignal[]): AbortSignal {
  throw new Error('Not implemented');
}
