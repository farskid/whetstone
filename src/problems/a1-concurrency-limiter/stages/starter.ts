export interface Limiter {
  run<T>(fn: () => T | Promise<T>): Promise<T>;
}

export function createLimiter(concurrency: number): Limiter {
  throw new Error('Not implemented');
}
