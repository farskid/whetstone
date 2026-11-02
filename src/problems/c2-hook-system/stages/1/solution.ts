import type { TapOptions } from './types';

interface TapInfo { name: string; fn: (...args: any[]) => any }

abstract class Hook<A extends unknown[], R> {
  protected taps: TapInfo[] = [];

  tap(options: TapOptions, fn: (...args: A) => R): void {
    const opts = typeof options === 'string' ? { name: options } : options;
    if (!opts || typeof opts.name !== 'string' || !opts.name) throw new Error('A tap needs a name');
    this.taps.push({ name: opts.name, fn });
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
