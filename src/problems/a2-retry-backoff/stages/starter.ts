export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  clock?: Clock;
}

export function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  throw new Error('Not implemented');
}
