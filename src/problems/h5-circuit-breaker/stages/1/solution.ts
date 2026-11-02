import type { State, BreakerOptions } from './types';

export class OpenCircuitError extends Error {
  constructor() {
    super('Breaker is open');
    this.name = 'OpenCircuitError';
  }
}

type Outcome<R> = { ok: true; value: R } | { ok: false; error: unknown };

export class CircuitBreaker<A extends unknown[], R> {
  private readonly fn: (...args: A) => Promise<R>;
  private readonly failureThreshold: number;
  private _state: State = 'closed';
  private consecutive = 0;

  constructor(fn: (...args: A) => Promise<R>, options: BreakerOptions = {}) {
    this.fn = fn;
    this.failureThreshold = options.failureThreshold ?? 5;
  }

  get state(): State {
    return this._state;
  }

  async fire(...args: A): Promise<R> {
    if (this._state === 'open') {
      throw new OpenCircuitError();
    }
    const outcome = await this.run(args);
    if (outcome.ok) {
      this.record(true);
      return outcome.value;
    }
    this.record(false);
    throw outcome.error;
  }

  private run(args: A): Promise<Outcome<R>> {
    return new Promise((resolve) => {
      const finish = (o: Outcome<R>) => resolve(o);
      let p: Promise<R>;
      try {
        p = Promise.resolve(this.fn(...args));
      } catch (error) {
        p = Promise.reject(error);
      }
      p.then((value) => finish({ ok: true, value }), (error) => finish({ ok: false, error }));
    });
  }

  private record(ok: boolean) {
    if (this._state !== 'closed') return;
    this.consecutive = ok ? 0 : this.consecutive + 1;
    if (!ok && this.consecutive >= this.failureThreshold) this.open();
  }

  private open() {
    this._state = 'open';
  }
}
