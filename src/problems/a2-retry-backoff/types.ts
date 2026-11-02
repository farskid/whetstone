export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
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
