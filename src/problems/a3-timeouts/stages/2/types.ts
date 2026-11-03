export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

/** What `withTimeout` races against the deadline: a promise (stage 3 adds a task function). */
export type TimeoutInput<T> = Promise<T>;

export interface TimeoutOptions<T> {
  fallback?: T | (() => T | Promise<T>);
  message?: string | Error;
  clock?: Clock;
}
