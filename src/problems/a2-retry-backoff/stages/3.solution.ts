export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export class AbortError extends Error {
  readonly originalError: Error;
  constructor(errorOrMessage: Error | string) {
    super(typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage.message);
    this.name = 'AbortError';
    this.originalError = typeof errorOrMessage === 'string' ? this : errorOrMessage;
  }
}

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
  maxTimeout?: number;
  randomize?: boolean;
  random?: () => number;
  shouldRetry?: (error: Error) => boolean | Promise<boolean>;
  clock?: Clock;
}

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

const sleep = (ms: number, clock: Clock) => new Promise<void>((resolve) => { clock.setTimeout(resolve, ms); });

const toError = (e: unknown) => (e instanceof Error ? e : new TypeError('Non-error was thrown: ' + String(e)));

export async function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 10, minTimeout = 1000, factor = 2, maxTimeout = Infinity, randomize = false, random = Math.random, shouldRetry, clock = globalClock } = options;
  for (let attempt = 1; ; attempt++) {
    let error: Error;
    try {
      return await fn(attempt);
    } catch (e) {
      error = toError(e);
    }
    if (error instanceof AbortError) throw error.originalError;
    if (attempt > retries) throw error;
    if (shouldRetry && !(await shouldRetry(error))) throw error;
    let delay = Math.min(maxTimeout, minTimeout * factor ** (attempt - 1));
    if (randomize) delay *= random();
    await sleep(delay, clock);
  }
}
