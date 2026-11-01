// Bug: anySignal keeps listening after the first abort, and ignores already-aborted inputs.
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

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

export function withTimeout<T>(
  input: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  ms: number,
  options: TimeoutOptions<T> = {},
): Promise<T> {
  const { clock = globalClock, signal: outer } = options;
  const hasFallback = 'fallback' in options;
  if (outer?.aborted) return Promise.reject(outer.reason);
  const controller = new AbortController();

  return new Promise<T>((resolve, reject) => {
    let done = false;
    let timer: unknown = undefined;
    const finish = () => {
      done = true;
      if (timer !== undefined) clock.clearTimeout(timer);
      outer?.removeEventListener('abort', onOuterAbort);
    };
    function onOuterAbort() {
      if (done) return;
      finish();
      controller.abort(outer!.reason);
      reject(outer!.reason);
    }
    outer?.addEventListener('abort', onOuterAbort);

    if (ms !== Infinity) {
      timer = clock.setTimeout(() => {
        if (done) return;
        timer = undefined;
        finish();
        const error = options.message instanceof Error
          ? options.message
          : new TimeoutError(options.message ?? `Timed out after ${ms} ms`);
        controller.abort(error);
        if (!hasFallback) return reject(error);
        const fb = options.fallback;
        try {
          resolve(typeof fb === 'function' ? (fb as () => T | Promise<T>)() : fb as T);
        } catch (e) {
          reject(e);
        }
      }, ms);
    }

    let promise: Promise<T>;
    try {
      promise = Promise.resolve(typeof input === 'function' ? input(controller.signal) : input);
    } catch (e) {
      promise = Promise.reject(e);
    }
    promise.then(
      (v) => { if (!done) { finish(); resolve(v); } },
      (e) => { if (!done) { finish(); reject(e); } },
    );
  });
}

export function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  function onAbort(this: AbortSignal) {
    controller.abort(this.reason);
  }
  for (const s of signals) s.addEventListener('abort', onAbort);
  return controller.signal;
}
