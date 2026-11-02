export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
  maxTimeout?: number;
  randomize?: boolean;
  random?: () => number;
  shouldRetry?: (error: Error) => boolean | Promise<boolean>;
  clock?: Clock;
}
