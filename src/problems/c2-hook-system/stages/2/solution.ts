import type { TapOptions } from './types';

interface TapInfo { name: string; type: 'sync' | 'promise'; fn: (...args: any[]) => any }

abstract class Hook<A extends unknown[], R> {
  protected taps: TapInfo[] = [];

  tap(options: TapOptions, fn: (...args: A) => R): void {
    this.insert(options, 'sync', fn);
  }

  protected insert(options: TapOptions, type: TapInfo['type'], fn: (...args: any[]) => any) {
    const opts = typeof options === 'string' ? { name: options } : options;
    if (!opts || typeof opts.name !== 'string' || !opts.name) throw new Error('A tap needs a name');
    this.taps.push({ name: opts.name, type, fn });
  }

  /** Taps added during a call wait for the next one. */
  protected begin(): TapInfo[] {
    return this.taps.slice();
  }
}

export class SyncHook<A extends unknown[] = []> extends Hook<A, unknown> {
  call(...args: A): void {
    for (const t of this.begin()) t.fn(...args);
  }
}

export class SyncBailHook<A extends unknown[] = [], R = unknown> extends Hook<A, R | undefined> {
  call(...args: A): R | undefined {
    for (const t of this.begin()) {
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
    for (const t of this.begin()) {
      const r = t.fn(value, ...rest);
      if (r !== undefined) value = r;
    }
    return value;
  }
}
