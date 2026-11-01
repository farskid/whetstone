// Bug: Results from before a state change still count.
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export type State = 'closed' | 'open' | 'halfOpen';

export interface WindowOptions {
  /** How far back the rolling window looks, in ms. */
  durationMs: number;
  /** Open when failures are at least this percentage of calls in the window. */
  errorPercentage: number;
  /** Minimum calls in the window before it can open (default 1). */
  volumeThreshold?: number;
}

export interface BreakerOptions {
  clock?: Clock;
  /** Consecutive failures that open the circuit. Default 5, or off when a window is given. */
  failureThreshold?: number;
  /** ms to stay open before going half-open (default 30000). */
  resetTimeout?: number;
  /** ms before a call counts as failed (default: no timeout). */
  timeout?: number;
  window?: WindowOptions;
  /** Trial calls allowed at once while half-open (default 1). */
  halfOpenMax?: number;
  /** Return true for errors that should not count as failures. */
  errorFilter?: (error: unknown) => boolean;
}

export type BreakerEvent = 'open' | 'halfOpen' | 'close' | 'reject' | 'success' | 'failure' | 'timeout' | 'fallback';

export class OpenCircuitError extends Error {
  constructor() {
    super('Breaker is open');
    this.name = 'OpenCircuitError';
  }
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms} ms`);
    this.name = 'TimeoutError';
  }
}

const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

type Outcome<R> = { ok: true; value: R } | { ok: false; error: unknown; timedOut: boolean };

export class CircuitBreaker<A extends unknown[], R> {
  private readonly fn: (...args: A) => Promise<R>;
  private readonly clock: Clock;
  private readonly opts: BreakerOptions;
  private readonly failureThreshold: number;
  private _state: State = 'closed';
  private generation = 0;
  private consecutive = 0;
  private calls: { at: number; ok: boolean }[] = [];
  private trials = 0;
  private resetTimer: unknown = null;
  private fallbackFn: ((error: unknown, ...args: A) => R | Promise<R>) | null = null;
  private listeners = new Map<BreakerEvent, Set<(payload?: unknown) => void>>();

  constructor(fn: (...args: A) => Promise<R>, options: BreakerOptions = {}) {
    this.fn = fn;
    this.opts = options;
    this.clock = options.clock ?? realClock;
    this.failureThreshold = options.failureThreshold ?? (options.window ? Infinity : 5);
  }

  get state(): State {
    return this._state;
  }

  on(event: BreakerEvent, listener: (payload?: unknown) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(listener);
    return () => set!.delete(listener);
  }

  fallback(fn: (error: unknown, ...args: A) => R | Promise<R>): this {
    this.fallbackFn = fn;
    return this;
  }

  async fire(...args: A): Promise<R> {
    if (this._state === 'open' || (this._state === 'halfOpen' && this.trials >= (this.opts.halfOpenMax ?? 1))) {
      const error = new OpenCircuitError();
      this.emit('reject', error);
      return this.fail(error, args);
    }
    const gen = this.generation;
    if (this._state === 'halfOpen') this.trials++;
    const outcome = await this.run(args);
    if (outcome.ok) {
      this.emit('success', outcome.value);
      this.record(true, gen);
      return outcome.value;
    }
    if (this.opts.errorFilter?.(outcome.error)) {
      this.record(true, gen);
      throw outcome.error;
    }
    if (outcome.timedOut) this.emit('timeout', outcome.error);
    this.emit('failure', outcome.error);
    this.record(false, gen);
    return this.fail(outcome.error, args);
  }

  private run(args: A): Promise<Outcome<R>> {
    return new Promise((resolve) => {
      let done = false;
      let timer: unknown = null;
      const finish = (o: Outcome<R>) => {
        if (done) return;
        done = true;
        if (timer !== null) this.clock.clearTimeout(timer);
        resolve(o);
      };
      const ms = this.opts.timeout;
      if (ms !== undefined) timer = this.clock.setTimeout(() => finish({ ok: false, error: new TimeoutError(ms), timedOut: true }), ms);
      let p: Promise<R>;
      try {
        p = Promise.resolve(this.fn(...args));
      } catch (error) {
        p = Promise.reject(error);
      }
      p.then((value) => finish({ ok: true, value }), (error) => finish({ ok: false, error, timedOut: false }));
    });
  }

  private async fail(error: unknown, args: A): Promise<R> {
    if (!this.fallbackFn) throw error;
    const value = await this.fallbackFn(error, ...args);
    this.emit('fallback', value);
    return value;
  }

  private record(ok: boolean, gen: number) {
    if (this._state === 'halfOpen') {
      if (ok) this.close();
      else this.open();
      return;
    }
    if (this._state !== 'closed') return;
    this.consecutive = ok ? 0 : this.consecutive + 1;
    const w = this.opts.window;
    let windowTrips = false;
    if (w) {
      const now = this.clock.now();
      this.calls.push({ at: now, ok });
      this.calls = this.calls.filter((c) => c.at > now - w.durationMs);
      const failures = this.calls.filter((c) => !c.ok).length;
      windowTrips = this.calls.length >= (w.volumeThreshold ?? 1) && (failures / this.calls.length) * 100 >= w.errorPercentage;
    }
    if (!ok && (this.consecutive >= this.failureThreshold || windowTrips)) this.open();
  }

  private transition(state: State) {
    this._state = state;
    this.generation++;
    this.trials = 0;
    this.emit(state === 'closed' ? 'close' : state);
  }

  private open() {
    this.transition('open');
    this.resetTimer = this.clock.setTimeout(() => {
      this.resetTimer = null;
      this.transition('halfOpen');
    }, this.opts.resetTimeout ?? 30000);
  }

  private close() {
    this.consecutive = 0;
    this.calls = [];
    this.transition('closed');
  }

  private emit(event: BreakerEvent, payload?: unknown) {
    for (const l of [...(this.listeners.get(event) ?? [])]) l(payload);
  }
}
