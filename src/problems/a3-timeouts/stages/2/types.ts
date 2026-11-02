export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface TimeoutOptions<T> {
  fallback?: T | (() => T | Promise<T>);
  message?: string | Error;
  clock?: Clock;
}
