export type TapOptions = string | { name: string; stage?: number; before?: string | string[] };
export type TapType = 'sync' | 'promise';
export interface TapInfo { name: string; type: TapType; stage: number; fn: (...args: any[]) => any }
export interface Interceptor {
  call?: (...args: any[]) => void;
  tap?: (tap: TapInfo) => void;
}

abstract class Hook<A extends unknown[], R> {
  tap(options: TapOptions, fn: (...args: A) => R): void {
    throw new Error('Not implemented');
  }

  intercept(interceptor: Interceptor): void {
    throw new Error('Not implemented');
  }
}

export class SyncHook<A extends unknown[] = []> extends Hook<A, unknown> {
  call(...args: A): void {
    throw new Error('Not implemented');
  }
}

export class SyncBailHook<A extends unknown[] = [], R = unknown> extends Hook<A, R | undefined> {
  call(...args: A): R | undefined {
    throw new Error('Not implemented');
  }
}

export class SyncWaterfallHook<A extends [unknown, ...unknown[]]> extends Hook<A, A[0] | undefined> {
  call(...args: A): A[0] {
    throw new Error('Not implemented');
  }
}

abstract class AsyncHook<A extends unknown[]> extends Hook<A, unknown> {
  tapPromise(options: TapOptions, fn: (...args: A) => Promise<unknown>): void {
    throw new Error('Not implemented');
  }
}

export class AsyncSeriesHook<A extends unknown[] = []> extends AsyncHook<A> {
  promise(...args: A): Promise<void> {
    throw new Error('Not implemented');
  }
}

export class AsyncParallelHook<A extends unknown[] = []> extends AsyncHook<A> {
  promise(...args: A): Promise<void> {
    throw new Error('Not implemented');
  }
}
