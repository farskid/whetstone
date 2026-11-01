export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
  maxTimeout?: number;
  randomize?: boolean;
  random?: () => number;
  clock?: Clock;
}

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

const sleep = (ms: number, clock: Clock) => new Promise<void>((resolve) => { clock.setTimeout(resolve, ms); });

const toError = (e: unknown) => (e instanceof Error ? e : new TypeError('Non-error was thrown: ' + String(e)));

export async function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 10, minTimeout = 1000, factor = 2, maxTimeout = Infinity, randomize = false, random = Math.random, clock = globalClock } = options;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt > retries) throw toError(e);
    }
    let delay = Math.min(maxTimeout, minTimeout * factor ** (attempt - 1));
    if (randomize) delay *= random();
    await sleep(delay, clock);
  }
}
