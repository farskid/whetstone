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
  clock?: Clock;
}

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

export function withTimeout<T>(promise: Promise<T>, ms: number, options: TimeoutOptions<T> = {}): Promise<T> {
  const { clock = globalClock } = options;
  const hasFallback = 'fallback' in options;
  return new Promise<T>((resolve, reject) => {
    let done = false;
    let timer: unknown = undefined;
    if (ms !== Infinity) {
      timer = clock.setTimeout(() => {
        if (done) return;
        done = true;
        const error = options.message instanceof Error
          ? options.message
          : new TimeoutError(options.message ?? `Timed out after ${ms} ms`);
        if (!hasFallback) return reject(error);
        const fb = options.fallback;
        try {
          resolve(typeof fb === 'function' ? (fb as () => T | Promise<T>)() : fb as T);
        } catch (e) {
          reject(e);
        }
      }, ms);
    }
    const settle = (fn: () => void) => {
      if (done) return;
      done = true;
      if (timer !== undefined) clock.clearTimeout(timer);
      fn();
    };
    promise.then((v) => settle(() => resolve(v)), (e) => settle(() => reject(e)));
  });
}
