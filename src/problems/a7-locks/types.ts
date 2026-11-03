export interface Clock { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void }

/** Gives the held units back. Calling it again does nothing. */
export type Release = () => void;

/** Options for `new Semaphore(capacity, options)` and `new Mutex(options)`. */
export interface LockOptions {
  clock?: Clock;
}

/** Options for `acquire`. */
export interface AcquireOptions {
  /** Reject with Error('Acquire timed out') if not granted within this many ms. */
  timeout?: number;
}
