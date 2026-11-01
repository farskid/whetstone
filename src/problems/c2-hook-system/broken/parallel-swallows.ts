// Bug: parallel hook waits for all and ignores rejections
export type TapOptions = string | { name: string; stage?: number; before?: string | string[] };
export type TapType = 'sync' | 'promise';
export interface TapInfo { name: string; type: TapType; stage: number; fn: (...args: any[]) => any }
export interface Interceptor {
  call?: (...args: any[]) => void;
  tap?: (tap: TapInfo) => void;
}

abstract class Hook<A extends unknown[], R> {
  protected taps: TapInfo[] = [];
  protected interceptors: Interceptor[] = [];

  tap(options: TapOptions, fn: (...args: A) => R): void {
    this.insert(options, 'sync', fn);
  }

  intercept(interceptor: Interceptor): void {
    this.interceptors.push(interceptor);
  }

  protected insert(options: TapOptions, type: TapType, fn: (...args: any[]) => any) {
    const opts = typeof options === 'string' ? { name: options } : options;
    if (!opts || typeof opts.name !== 'string' || !opts.name) throw new Error('A tap needs a name');
    const stage = opts.stage ?? 0;
    const before = new Set(opts.before === undefined ? [] : Array.isArray(opts.before) ? opts.before : [opts.before]);
    let pos = this.taps.length;
    while (pos > 0 && this.taps[pos - 1].stage > stage) pos--;
    const firstBefore = this.taps.findIndex((t) => before.has(t.name));
    if (firstBefore >= 0 && firstBefore < pos) pos = firstBefore;
    this.taps.splice(pos, 0, { name: opts.name, type, stage, fn });
  }

  /** Snapshot taps and run call interceptors. */
  protected begin(args: unknown[]): TapInfo[] {
    const taps = this.taps.slice();
    for (const i of this.interceptors) i.call?.(...args);
    return taps;
  }

  protected before(tap: TapInfo) {
    for (const i of this.interceptors) i.tap?.(tap);
  }
}

export class SyncHook<A extends unknown[] = []> extends Hook<A, unknown> {
  call(...args: A): void {
    for (const t of this.begin(args)) { this.before(t); t.fn(...args); }
  }
}

export class SyncBailHook<A extends unknown[] = [], R = unknown> extends Hook<A, R | undefined> {
  call(...args: A): R | undefined {
    for (const t of this.begin(args)) {
      this.before(t);
      const r = t.fn(...args);
      if (r !== undefined) return r;
    }
    return undefined;
  }
}

export class SyncWaterfallHook<A extends [unknown, ...unknown[]]> extends Hook<A, A[0] | undefined> {
  call(...args: A): A[0] {
    const [first, ...rest] = args;
    let value = first;
    for (const t of this.begin(args)) {
      this.before(t);
      const r = t.fn(value, ...rest);
      if (r !== undefined) value = r;
    }
    return value;
  }
}

function runTap(t: TapInfo, args: unknown[]): Promise<unknown> {
  if (t.type === 'sync') {
    try { return Promise.resolve(t.fn(...args)); } catch (e) { return Promise.reject(e); }
  }
  let out: unknown;
  try { out = t.fn(...args); } catch (e) { return Promise.reject(e); }
  if (!out || typeof (out as any).then !== 'function') {
    return Promise.reject(new Error(`Tap "${t.name}" (tapPromise) did not return a promise`));
  }
  return out as Promise<unknown>;
}

abstract class AsyncHook<A extends unknown[]> extends Hook<A, unknown> {
  tapPromise(options: TapOptions, fn: (...args: A) => Promise<unknown>): void {
    this.insert(options, 'promise', fn);
  }
}

export class AsyncSeriesHook<A extends unknown[] = []> extends AsyncHook<A> {
  async promise(...args: A): Promise<void> {
    const taps = this.begin(args);
    for (const t of taps) {
      this.before(t);
      await runTap(t, args);
    }
  }
}

export class AsyncParallelHook<A extends unknown[] = []> extends AsyncHook<A> {
  promise(...args: A): Promise<void> {
    let taps: TapInfo[];
    try { taps = this.begin(args); } catch (e) { return Promise.reject(e); }
    const running = taps.map((t) => {
      try { this.before(t); } catch (e) { return Promise.reject(e); }
      return runTap(t, args);
    });
    return Promise.allSettled(running).then(() => undefined);
  }
}
