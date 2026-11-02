export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  clock?: Clock;
}
