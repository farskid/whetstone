export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export interface TimeoutOptions<T> {
  fallback?: T | (() => T | Promise<T>);
  message?: string | Error;
  signal?: AbortSignal;
  clock?: Clock;
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
