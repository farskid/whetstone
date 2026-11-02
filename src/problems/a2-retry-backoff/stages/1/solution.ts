import type { Clock, RetryOptions } from './types';

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

const sleep = (ms: number, clock: Clock) => new Promise<void>((resolve) => { clock.setTimeout(resolve, ms); });

const toError = (e: unknown) => (e instanceof Error ? e : new TypeError('Non-error was thrown: ' + String(e)));

export async function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 10, minTimeout = 1000, clock = globalClock } = options;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt > retries) throw toError(e);
    }
    await sleep(minTimeout, clock);
  }
}
