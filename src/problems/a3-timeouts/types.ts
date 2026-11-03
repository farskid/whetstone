export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

/** What `withTimeout` races against the deadline: a promise, or a task that gets an `AbortSignal` to cancel. */
export type TimeoutInput<T> = Promise<T> | ((signal: AbortSignal) => Promise<T>);

export interface TimeoutOptions<T> {
  fallback?: T | (() => T | Promise<T>);
  message?: string | Error;
  signal?: AbortSignal;
  clock?: Clock;
}
