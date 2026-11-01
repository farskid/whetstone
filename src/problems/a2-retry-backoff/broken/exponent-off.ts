// Bug: the first wait is already minTimeout * factor.
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

export interface FailedAttempt { error: Error; attempt: number; retriesLeft: number }

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
  maxTimeout?: number;
  randomize?: boolean;
  random?: () => number;
  shouldRetry?: (error: Error) => boolean | Promise<boolean>;
  onFailedAttempt?: (info: FailedAttempt) => void | Promise<void>;
  signal?: AbortSignal;
  clock?: Clock;
}

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

function sleep(ms: number, clock: Clock, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = clock.setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    function onAbort() { clock.clearTimeout(id); reject(signal!.reason); }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function retry<T>(fn: (attempt: number) => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 10, minTimeout = 1000, factor = 2, maxTimeout = Infinity,
    randomize = false, random = Math.random, shouldRetry, onFailedAttempt, signal, clock = globalClock,
  } = options;

  for (let attempt = 1; ; attempt++) {
    if (signal?.aborted) throw signal.reason;
    let error: Error;
    try {
      return await fn(attempt);
    } catch (e) {
      error = e instanceof Error ? e : new TypeError('Non-error was thrown: ' + String(e));
    }
    if (error instanceof AbortError) throw error.originalError;
    if (signal?.aborted) throw signal.reason;
    const retriesLeft = retries + 1 - attempt;
    await onFailedAttempt?.({ error, attempt, retriesLeft });
    if (retriesLeft <= 0) throw error;
    if (shouldRetry && !(await shouldRetry(error))) throw error;
    let delay = Math.min(maxTimeout, minTimeout * factor ** attempt);
    if (randomize) delay *= random();
    await sleep(delay, clock, signal);
  }
}
