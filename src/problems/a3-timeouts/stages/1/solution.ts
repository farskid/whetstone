import type { Clock, TimeoutOptions } from './types';

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

export function withTimeout<T>(promise: Promise<T>, ms: number, options: TimeoutOptions = {}): Promise<T> {
  const { clock = globalClock } = options;
  return new Promise<T>((resolve, reject) => {
    if (ms !== Infinity) clock.setTimeout(() => reject(new TimeoutError(`Timed out after ${ms} ms`)), ms);
    promise.then(resolve, reject);
  });
}
