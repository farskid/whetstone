import type { TapOptions } from './types';

abstract class Hook<A extends unknown[], R> {
  tap(options: TapOptions, fn: (...args: A) => R): void {
    throw new Error('Not implemented');
  }
}

export class SyncHook<A extends unknown[] = []> extends Hook<A, unknown> {
  call(...args: A): void {
    throw new Error('Not implemented');
  }
}
