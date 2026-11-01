export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export class AbortError extends Error {
  readonly originalError: Error;
  constructor(errorOrMessage: Error | string) {
    super(typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage.message);
    this.name = 'AbortError';
    this.originalError = typeof errorOrMessage === 'string' ? this : errorOrMessage;
  }
}

export interface FailedAttempt { error: Error; attempt: number; retriesLeft: number }

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
  maxTimeout?: number;
  randomize?: boolean;
  random?: () => number;
  shouldRetry?: (error: Error) => boolean | Promise<boolean>;
  onFailedAttempt?: (info: FailedAttempt) => void | Promise<void>;
  signal?: AbortSignal;
  clock?: Clock;
}

export function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  throw new Error('Not implemented');
}
