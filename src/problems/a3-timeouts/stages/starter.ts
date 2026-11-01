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

export interface TimeoutOptions {
  clock?: Clock;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, options: TimeoutOptions = {}): Promise<T> {
  throw new Error('Not implemented');
}
