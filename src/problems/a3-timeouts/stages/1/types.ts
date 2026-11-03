export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

/** What `withTimeout` races against the deadline: a promise (stage 3 adds a task function). */
export type TimeoutInput<T> = Promise<T>;

/** `T` is the result type; stage 2's `fallback` uses it. */
export interface TimeoutOptions<T> {
  clock?: Clock;
}
